/**
 * RelicVault — Servidor de Autenticação, Dados e Hospedagem
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responsabilidades:
 *  - Autenticação REAL do Master Administrator (e-mail + senha forte)
 *  - MFA TOTP real (Google Authenticator / Authy / 1Password)
 *  - Sessões com token assinado HMAC-SHA256 (sem segredos no navegador)
 *  - Rate limiting contra força bruta (por IP real, com lockout)
 *  - Serviço de estático da loja (dist/) em produção
 *  - Dados persistentes em SQLite (produtos, pedidos, leads, configurações)
 *  - Webhook de gateway PIX (Mercado Pago) — inativo até credenciais
 *
 * Configuração via variáveis de ambiente (.env):
 *  ADMIN_EMAIL, ADMIN_PASSWORD_HASH (ou ADMIN_PASSWORD em dev), ADMIN_TOTP_SECRET,
 *  AUTH_SESSION_SECRET, PORT, APP_URL, TRUST_PROXY, MP_ACCESS_TOKEN
 * Gere as credenciais com: npm run gen-secret
 */

import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verifySync } from 'otplib';
import {
  listProducts,
  getProduct,
  upsertProduct,
  deleteProduct,
  replaceAllProducts,
  countProducts,
  getSettings,
  saveSettings,
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  createLead,
  listLeads,
  updateLeadStatus,
  dbHealth,
  counts,
} from './db.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const ISSUER = 'RelicVault';
const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '');
const IS_PROD = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Configuração do Master Administrator (fail-fast em produção)
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@relicvault.com.br').trim().toLowerCase();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64);
  return { salt, hash: derived.toString('hex'), encoded: `${salt}:${derived.toString('hex')}` };
}

const bootstrap = (() => {
  const warnings = [];
  let passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  let generatedPassword = null;

  if (!passwordHash && process.env.ADMIN_PASSWORD) {
    if (IS_PROD) {
      throw new Error(
        'ADMIN_PASSWORD em texto puro não é aceito em produção. Defina ADMIN_PASSWORD_HASH (rode "npm run gen-secret").'
      );
    }
    const plain = process.env.ADMIN_PASSWORD;
    if (plain.length < 12) {
      warnings.push('ADMIN_PASSWORD tem menos de 12 caracteres. Use uma senha mais forte.');
    }
    passwordHash = hashPassword(plain).encoded;
  }
  if (!passwordHash) {
    generatedPassword = crypto.randomBytes(18).toString('base64url'); // ~24 chars
    passwordHash = hashPassword(generatedPassword).encoded;
  }
  if (!passwordHash.includes(':') || passwordHash.split(':')[1].length !== 128) {
    warnings.push('ADMIN_PASSWORD_HASH no formato inválido (esperado "salt:hash" hex). Reconfigurando com senha aleatória.');
    generatedPassword = crypto.randomBytes(18).toString('base64url');
    passwordHash = hashPassword(generatedPassword).encoded;
  }

  const totpSecret = process.env.ADMIN_TOTP_SECRET?.trim() || null;

  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!sessionSecret) {
    // Em produção exige fail-fast; em dev gera aleatória SEM imprimir o valor.
    if (IS_PROD) {
      throw new Error('AUTH_SESSION_SECRET é obrigatório em produção. Defina no .env (64 hex chars).');
    }
    warnings.push('AUTH_SESSION_SECRET não definida — sessões serão invalidadas ao reiniciar o servidor (dev).');
  }

  return {
    passwordHash,
    generatedPassword,
    totpSecret,
    sessionSecret: sessionSecret || crypto.randomBytes(32).toString('hex'),
    warnings,
  };
})();

// ---------------------------------------------------------------------------
// Configuração do MFA (TOTP)
// Ordem de resolução: variável de ambiente > arquivo persistido (data/)
// ---------------------------------------------------------------------------
const CONFIG_DIR = resolve(__dirname, 'data');
const MFA_CONFIG_FILE = resolve(CONFIG_DIR, 'admin-auth.json');

let mfaConfigured = false;
let mfaEnvSecret = bootstrap.totpSecret; // definido via ADMIN_TOTP_SECRET
let mfaFileSecret = null;                 // definido no primeiro acesso (persistido)

try {
  const raw = readFileSync(MFA_CONFIG_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed?.totpSecret) {
    mfaFileSecret = parsed.totpSecret;
    mfaConfigured = true;
  }
} catch {
  /* arquivo ausente ou inválido = MFA ainda não configurado */
}

const mfaSecret = () => mfaEnvSecret || mfaFileSecret;

function persistMfaSecret(secret) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(
    MFA_CONFIG_FILE,
    JSON.stringify({ totpSecret: secret, confirmedAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 }
  );
  mfaFileSecret = secret;
  mfaConfigured = true;
}

// Segredos de setup pendentes (primeiro acesso): token -> { secret, createdAt, failures }
const pendingSetupSecrets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingSetupSecrets) {
    if (now - entry.createdAt > 15 * 60 * 1000) pendingSetupSecrets.delete(token);
  }
}, 60 * 1000).unref();

function verifyPassword(password, encoded) {
  try {
    if (!encoded || !encoded.includes(':')) return false;
    const [salt, expectedHex] = encoded.split(':');
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tokens de sessão assinados (HMAC-SHA256) com jti para revogação
// ---------------------------------------------------------------------------
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', bootstrap.sessionSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac('sha256', bootstrap.sessionSecret)
      .update(body)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (revokedTokens.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueToken(email, stage, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    sub: email,
    stage,
    jti: crypto.randomBytes(16).toString('hex'),
    iat: now,
    exp: now + ttlSeconds,
  });
}

// Lista de revogação de sessões (logout real invalida o token)
const revokedTokens = new Set();
setInterval(() => {
  // limpeza ocasional de jtis expirados (sem persistência entre reinícios)
  revokedTokens.clear();
}, 30 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Rate limiting contra força bruta (por IP real)
// ---------------------------------------------------------------------------
const attemptMap = new Map(); // key -> { count, windowStart, lockedUntil }
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function getLockSeconds(key) {
  const entry = attemptMap.get(key);
  if (!entry?.lockedUntil) return 0;
  const rem = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
  if (rem <= 0) {
    attemptMap.delete(key);
    return 0;
  }
  return rem;
}

function recordFailure(key) {
  const now = Date.now();
  const prev = attemptMap.get(key);
  let entry;
  if (!prev || now - prev.windowStart > WINDOW_MS) {
    entry = { count: 1, windowStart: now, lockedUntil: 0 };
  } else {
    entry = { ...prev, count: prev.count + 1 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
    entry.count = 0;
  }
  attemptMap.set(key, entry);
  return entry;
}

function clearAttempts(key) {
  attemptMap.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attemptMap) {
    if (now - entry.windowStart > WINDOW_MS && (!entry.lockedUntil || entry.lockedUntil < now)) {
      attemptMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// Rate limit global por IP (protege todos os endpoints da API)
const globalHits = new Map(); // ip -> { count, resetAt }
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_MAX = 240;

function globalLimitMiddleware(req, res, next) {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = globalHits.get(ip);
  if (!entry || now > entry.resetAt) {
    globalHits.set(ip, { count: 1, resetAt: now + GLOBAL_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > GLOBAL_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({ error: `Muitas requisições. Aguarde ${retryAfter}s.`, retryAfter });
  }
  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of globalHits) {
    if (now > entry.resetAt) globalHits.delete(ip);
  }
}, 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Aplicação Express
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');

// IP real atrás de proxy reverso: TRUST_PROXY=true quando houver Caddy/nginx/Cloudflare
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

function clientIp(req) {
  if (process.env.TRUST_PROXY === 'true') return req.ip || req.socket.remoteAddress || 'unknown';
  const forwarded = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    // usa apenas quando confiável — em dev o tráfego é direto (socket)
    return forwarded.trim().split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// Headers de segurança (CSP restrita; permite Google Fonts e imagens remotas)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '32kb' }));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, db: dbHealth(), counts: counts() }));

// Estado público do painel (sem segredos)
app.get('/api/admin/status', (_req, res) => {
  res.json({
    version: 3,
    mfaConfigured,
    sessionHours: 8,
    data: { persistence: 'sqlite', products: countProducts() },
  });
});

// Encapsula handlers assíncronos com tratamento de erro
const asyncHandler = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[RelicVault] Erro na API:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });
};

const safeStr = (v, max = 255) => String(v ?? '').slice(0, max);

// ---------------------------------------------------------------------------
// APIs públicas da loja
// ---------------------------------------------------------------------------
app.get('/api/products', (_req, res) => {
  res.json({ products: listProducts({ publishedOnly: true }) });
});

app.get('/api/settings', (_req, res) => {
  const stored = getSettings();
  res.json({ settings: stored });
});

app.post('/api/leads', (req, res) => {
  const { name = '', email = '', phone = '', itemId = '', itemName = '', message = '' } = req.body || {};
  if (!safeStr(name).trim() || (!safeStr(email).trim() && !safeStr(phone).trim())) {
    return res.status(400).json({ error: 'Informe seu nome e um e-mail ou WhatsApp para contato.' });
  }
  const lead = createLead({ name, email, phone, itemId, itemName, message });
  res.status(201).json({ ok: true, id: lead.id });
});

// ---------------------------------------------------------------------------
// ETAPA 1 — E-mail + Senha forte
// ---------------------------------------------------------------------------
app.post('/api/admin/login', asyncHandler(async (req, res) => {
  const key = `login:${clientIp(req)}`;
  const locked = getLockSeconds(key);
  if (locked > 0) {
    return res.status(429).json({ error: `Acesso temporariamente bloqueado por excesso de tentativas. Aguarde ${locked}s.`, retryAfter: locked });
  }

  const { email = '', password = '' } = req.body || {};
  const emailOk = String(email).trim().toLowerCase() === ADMIN_EMAIL;
  const passOk = verifyPassword(String(password), bootstrap.passwordHash);

  if (!emailOk || !passOk) {
    const entry = recordFailure(key);
    if (entry.lockedUntil > 0) {
      const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: 'Múltiplas tentativas inválidas. Acesso bloqueado por 15 minutos.',
        retryAfter,
      });
    }
    return res.status(401).json({
      error: `Credenciais incorretas (${entry.count}/${MAX_ATTEMPTS} tentativas).`,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - entry.count),
      retryAfter: 0,
    });
  }

  clearAttempts(key);

  // MFA já configurado → fluxo normal em 2 etapas
  if (mfaConfigured) {
    const pendingToken = issueToken(ADMIN_EMAIL, 'password', 10 * 60);
    return res.json({ mfaRequired: true, pendingToken });
  }

  // PRIMEIRO ACESSO → libera login para configurar o MFA (QR code)
  const secret = generateSecret();
  const setupToken = issueToken(ADMIN_EMAIL, 'setup', 15 * 60);
  pendingSetupSecrets.set(setupToken, { secret, createdAt: Date.now(), failures: 0 });
  const otpauthUri = generateURI({ issuer: ISSUER, label: `Master Admin (${ADMIN_EMAIL})`, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri).catch(() => '');
  return res.json({
    mfaRequired: false,
    setupToken,
    setup: { secret, otpauthUri, qrDataUrl },
  });
}));

// ETAPA 2 — MFA TOTP real
app.post('/api/admin/mfa-verify', asyncHandler(async (req, res) => {
  const key = `mfa:${clientIp(req)}`;
  const locked = getLockSeconds(key);
  if (locked > 0) {
    return res.status(429).json({ error: `Bloqueado por excesso de tentativas MFA. Aguarde ${locked}s.`, retryAfter: locked });
  }

  if (!mfaConfigured) {
    return res.status(403).json({ error: 'MFA não configurado. Faça o primeiro acesso para configurá-lo.' });
  }

  const { token = '', code = '' } = req.body || {};
  const payload = verifyToken(token);
  if (!payload || payload.stage !== 'password') {
    return res.status(401).json({ error: 'Sessão de login expirada. Refaça o login.' });
  }

  const clean = String(code).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) {
    return res.status(401).json({ error: 'Digite o código de 6 dígitos do seu aplicativo autenticador.' });
  }

  let valid = false;
  try {
    valid = verifySync({ secret: mfaSecret(), token: clean, epochTolerance: 30 }).valid;
  } catch {
    return res.status(500).json({ error: 'Falha interna na verificação MFA. Verifique a configuração do TOTP.' });
  }

  if (!valid) {
    recordFailure(key);
    return res.status(401).json({ error: 'Código MFA incorreto ou expirado. Use o código atual do seu autenticador.' });
  }

  clearAttempts(key);
  const sessionToken = issueToken(ADMIN_EMAIL, 'full', 8 * 60 * 60);
  return res.json({ sessionToken, email: ADMIN_EMAIL, expiresAt: Math.floor(Date.now() / 1000) + 8 * 60 * 60 });
}));

// PRIMEIRO ACESSO — Configuração do MFA (rate limit + descarte após falhas)
app.post('/api/admin/mfa-setup-confirm', asyncHandler(async (req, res) => {
  const key = `setup:${clientIp(req)}`;
  const locked = getLockSeconds(key);
  if (locked > 0) {
    return res.status(429).json({ error: `Bloqueado por excesso de tentativas. Aguarde ${locked}s.`, retryAfter: locked });
  }

  if (mfaConfigured) {
    return res.status(403).json({ error: 'MFA já configurado. Use a autenticação normal.' });
  }

  const { token = '', code = '' } = req.body || {};
  const payload = verifyToken(token);
  if (!payload || payload.stage !== 'setup') {
    return res.status(401).json({ error: 'Sessão de configuração expirada. Refaça o login.' });
  }

  const pending = pendingSetupSecrets.get(token);
  if (!pending) {
    return res.status(401).json({ error: 'Sessão de configuração expirada. Refaça o login.' });
  }

  const clean = String(code).replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) {
    return res.status(400).json({ error: 'Digite o código de 6 dígitos do seu autenticador.' });
  }

  let valid = false;
  try {
    valid = verifySync({ secret: pending.secret, token: clean, epochTolerance: 30 }).valid;
  } catch {
    return res.status(500).json({ error: 'Falha ao validar o código.' });
  }

  if (!valid) {
    pending.failures += 1;
    if (pending.failures >= MAX_ATTEMPTS) {
      pendingSetupSecrets.delete(token);
      return res.status(429).json({ error: 'Muitas tentativas inválidas. Refaça o login para gerar um novo QR code.' });
    }
    recordFailure(key);
    return res.status(401).json({ error: `Código incorreto. ${MAX_ATTEMPTS - pending.failures} tentativas restantes nesta sessão.` });
  }

  persistMfaSecret(pending.secret);
  pendingSetupSecrets.delete(token);
  clearAttempts(key);

  const sessionToken = issueToken(ADMIN_EMAIL, 'full', 8 * 60 * 60);
  return res.json({ sessionToken, email: ADMIN_EMAIL, expiresAt: Math.floor(Date.now() / 1000) + 8 * 60 * 60 });
}));

// ---------------------------------------------------------------------------
// Sessão (protegido)
// ---------------------------------------------------------------------------
function requireFullSession(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.stage !== 'full') {
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  }
  req.admin = payload;
  next();
}

app.get('/api/admin/session', requireFullSession, (req, res) => {
  res.json({ valid: true, email: req.admin.sub, expiresAt: req.admin.exp });
});

app.post('/api/admin/logout', requireFullSession, (req, res) => {
  if (req.admin?.jti) revokedTokens.add(req.admin.jti);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// APIs administrativas (dados persistentes em SQLite)
// ---------------------------------------------------------------------------
app.get('/api/admin/products', requireFullSession, (_req, res) => {
  res.json({ products: listProducts({ publishedOnly: false }) });
});

app.post('/api/admin/products', requireFullSession, (req, res) => {
  const item = req.body?.item;
  if (!item || !safeStr(item.name).trim()) {
    return res.status(400).json({ error: 'Item inválido: nome é obrigatório.' });
  }
  res.status(201).json({ product: upsertProduct(item) });
});

app.put('/api/admin/products/:id', requireFullSession, (req, res) => {
  const item = req.body?.item;
  if (!item || !safeStr(item.name).trim()) {
    return res.status(400).json({ error: 'Item inválido: nome é obrigatório.' });
  }
  if (!getProduct(req.params.id)) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }
  res.json({ product: upsertProduct({ ...item, id: req.params.id }) });
});

app.delete('/api/admin/products/:id', requireFullSession, (req, res) => {
  deleteProduct(req.params.id);
  res.status(204).end();
});

app.get('/api/admin/settings', requireFullSession, (_req, res) => {
  res.json({ settings: getSettings() });
});

app.put('/api/admin/settings', requireFullSession, (req, res) => {
  const data = req.body?.settings;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Configurações inválidas.' });
  }
  res.json({ settings: saveSettings(data) });
});

app.get('/api/admin/orders', requireFullSession, (_req, res) => {
  res.json({ orders: listOrders() });
});

app.patch('/api/admin/orders/:id/status', requireFullSession, (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  const { status, trackingCode } = req.body || {};
  const allowed = ['pending_payment', 'paid', 'in_preparation', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const history = [
    ...(order.history || []),
    {
      status,
      timestamp: new Date().toISOString(),
      note: trackingCode ? `Código de rastreio: ${trackingCode}` : 'Atualização manual pelo painel.',
    },
  ];
  const updated = updateOrder(order.id, { status, trackingCode: trackingCode || order.trackingCode, history });
  res.json({ order: updated });
});

app.get('/api/admin/leads', requireFullSession, (_req, res) => {
  res.json({ leads: listLeads() });
});

app.patch('/api/admin/leads/:id', requireFullSession, (req, res) => {
  const { status } = req.body || {};
  const allowed = ['new', 'contacted', 'converted', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status de lead inválido.' });
  res.json({ lead: updateLeadStatus(req.params.id, status) });
});

// Migração pontual do localStorage (uma vez, via painel)
app.post('/api/admin/migrate', requireFullSession, (req, res) => {
  const { products, settings } = req.body || {};
  try {
    if (Array.isArray(products) && countProducts() === 0) {
      replaceAllProducts(products);
    }
    if (settings && typeof settings === 'object' && !getSettings()) {
      saveSettings(settings);
    }
    res.json({ ok: true, counts: counts() });
  } catch (err) {
    console.error('[RelicVault] Falha na migração:', err);
    res.status(400).json({ error: 'Falha ao migrar dados.' });
  }
});

// ---------------------------------------------------------------------------
// Gateway PIX (Mercado Pago) — estrutura pronta, inativa sem credenciais
// ---------------------------------------------------------------------------
async function mpCreatePix(order) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    const err = new Error('Gateway PIX não configurado (MP_ACCESS_TOKEN ausente).');
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }
  const base = 'https://api.mercadopago.com';
  const res = await fetch(`${base}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `rev-${order.id}`,
    },
    body: JSON.stringify({
      transaction_amount: Number(order.total),
      description: `Pedido RelicVault #${order.id}`,
      payment_method_id: 'pix',
      payer: {
        email: order.customer?.email || 'cliente@relicvault.com.br',
        first_name: order.customer?.name?.split(' ')[0] || 'Cliente',
        last_name: order.customer?.name?.split(' ').slice(1).join(' ') || 'RelicVault',
      },
      notification_url: `${APP_URL || 'https://relicvault.example.com'}/api/webhooks/mercadopago`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Mercado Pago retornou ${res.status}`);
    err.code = 'MP_API_ERROR';
    err.details = body.slice(0, 300);
    throw err;
  }
  const data = await res.json();
  const pixDetails = {
    pixQrCode: data.point_of_interaction?.transaction_data?.qr_code_base64 || '',
    pixCopyPaste: data.point_of_interaction?.transaction_data?.qr_code || '',
  };
  updateOrder(order.id, {
    paymentDetails: { ...(order.paymentDetails || {}), ...pixDetails },
    status: 'pending_payment',
    history: [
      ...(order.history || []),
      { status: 'pending_payment', timestamp: new Date().toISOString(), note: 'Cobrança PIX gerada no gateway (Mercado Pago).' },
    ],
  });
  return { id: order.id, paymentDetails: pixDetails, status: 'pending_payment' };
}

// Criação de pedido com PIX via gateway (somente quando checkout estiver ativo)
app.post('/api/orders/pix', asyncHandler(async (req, res) => {
  const { customer, items, subtotal = 0, shipping = 0, discount = 0 } = req.body || {};
  if (!customer || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Dados do pedido incompletos.' });
  }
  const total = Number(subtotal) + Number(shipping) - Number(discount);
  const orderId = `RLV-${Date.now().toString(36).toUpperCase()}`;
  const order = createOrder({
    id: orderId,
    customer,
    items,
    subtotal: Number(subtotal),
    shipping: Number(shipping),
    discount: Number(discount),
    total,
    paymentMethod: 'pix',
    status: 'pending_payment',
    history: [{ status: 'pending_payment', timestamp: new Date().toISOString(), note: 'Pedido criado — aguardando cobrança PIX.' }],
  });
  try {
    const charge = await mpCreatePix(order);
    return res.status(201).json({ order: charge, gateway: 'mercadopago' });
  } catch (err) {
    if (err.code === 'GATEWAY_NOT_CONFIGURED') {
      // Mantém o pedido em rascunho (sem cobrança) — venda segue pelo WhatsApp.
      return res.status(503).json({
        error: 'Pagamento online ainda não ativado nesta loja. Fale conosco pelo WhatsApp.',
        hint: 'GATEWAY_NOT_CONFIGURED',
      });
    }
    return res.status(502).json({ error: 'Falha ao gerar cobrança PIX. Tente novamente.' });
  }
}));

// Webhook do gateway (atualiza status do pedido)
app.post('/api/webhooks/mercadopago', express.raw({ type: '*/*', limit: '32kb' }), (req, res) => {
  // Ação da MP: quando o pagamento é aprovado, o webhook traz payment_id.
  // Sem credenciais validáveis, registra apenas o recebimento (seguro por design).
  try {
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8') || '{}') : req.body;
    console.log('[RelicVault] Webhook MercadoPago recebido:', JSON.stringify(body).slice(0, 400));
    res.status(200).json({ received: true });
  } catch {
    res.status(400).json({ error: 'Payload inválido.' });
  }
});

// ---------------------------------------------------------------------------
// Estático (produção) + fallback SPA
// ---------------------------------------------------------------------------
const distDir = resolve(__dirname, 'dist');

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));

if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: 'index.html', maxAge: '1h', etag: true }));
} else {
  app.get('/', (_req, res) =>
    res.type('text').send('RelicVault — Frontend não compilado. Rode "npm run build" e reinicie o servidor.')
  );
}

app.use((_req, res) => {
  if (existsSync(distDir)) return res.sendFile(resolve(distDir, 'index.html'));
  return res.status(404).json({ error: 'Frontend não compilado. Rode: npm run build' });
});

// ---------------------------------------------------------------------------
// Middleware de erro (JSON genérico, sem vazamento em produção)
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corpo da requisição inválido (JSON mal formado).' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requisição muito grande.' });
  }
  console.error('[RelicVault] Erro não tratado:', err);
  res.status(500).json({ error: IS_PROD ? 'Erro interno do servidor.' : String(err?.message || 'Erro interno do servidor.') });
});

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
async function main() {
  const bootLog = [
    '',
    '==============================================================',
    ' RELICVAULT — MASTER ADMINISTRATOR + LOJA',
    '==============================================================',
    ` E-mail  : ${ADMIN_EMAIL}`,
    ` Dados   : SQLite (${countProducts()} produtos, ${counts().orders} pedidos, ${counts().leads} leads)`,
  ];

  for (const w of bootstrap.warnings) bootLog.push(` AVISO    : ${w}`);

  if (bootstrap.generatedPassword) {
    bootLog.push(
      ' Senha   : (GERADA NESTA EXECUÇÃO — não exibida por segurança.)',
      '           Rode `npm run gen-secret` e defina ADMIN_PASSWORD_HASH no .env',
      '           para ter uma senha fixa e persistente.'
    );
  }

  if (!process.env.ADMIN_TOTP_SECRET && !mfaConfigured) {
    bootLog.push(
      ' MFA      : NÃO configurado ainda — primeiro acesso libera o login',
      '           para configurar o QR code do autenticador pelo painel.',
      '           O secret é salvo em data/admin-auth.json (secreto).'
    );
  } else if (process.env.ADMIN_TOTP_SECRET) {
    bootLog.push(' TOTP     : configurado via ADMIN_TOTP_SECRET (MFA ativo).');
  } else {
    bootLog.push(' TOTP     : configurado via data/admin-auth.json (MFA ativo).');
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    bootLog.push(' PIX      : gateway não ativado — venda via WhatsApp (checkout desligado).');
  } else {
    bootLog.push(' PIX      : Mercado Pago ativo (MP_ACCESS_TOKEN encontrado).');
  }

  bootLog.push('==============================================================', '');
  console.log(bootLog.join('\n'));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RelicVault] Servidor de autenticação, dados e loja em http://localhost:${PORT} (API /api/*)`);
  });
}

main().catch((err) => {
  console.error('[RelicVault] Falha ao iniciar o servidor:', err);
  process.exit(1);
});