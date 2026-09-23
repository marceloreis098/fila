/**
 * RelicVault — Servidor de Autenticação e Hospedagem
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responsabilidades:
 *  - Autenticação REAL do Master Administrator (e-mail + senha forte)
 *  - MFA TOTP real (Google Authenticator / Authy / 1Password)
 *  - Sessões com token assinado HMAC-SHA256 (sem segredos no navegador)
 *  - Rate limiting contra força bruta (por IP, com lockout)
 *  - Serviço de estático da loja (dist/) em produção
 *
 * Configuração via variáveis de ambiente (.env):
 *  ADMIN_EMAIL, ADMIN_PASSWORD_HASH (ou ADMIN_PASSWORD), ADMIN_TOTP_SECRET,
 *  AUTH_SESSION_SECRET, PORT, APP_URL
 * Gere as credenciais com: npm run gen-secret
 */

import express from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verifySync } from 'otplib';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const ISSUER = 'RelicVault';

// ---------------------------------------------------------------------------
// Configuração do Master Administrator
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@relicvault.com.br').trim().toLowerCase();

// Senha: prioriza hash scrypt; aceita senha em texto (>= 12 chars) para agilidade
const bootstrap = (() => {
  const warnings = [];
  let passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  let generatedPassword = null;

  if (!passwordHash && process.env.ADMIN_PASSWORD) {
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

  const sessionSecret =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    crypto.randomBytes(32).toString('hex');

  return { passwordHash, generatedPassword, totpSecret, sessionSecret, warnings };
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

// Segredos de setup pendentes (primeiro acesso): token -> { secret, createdAt }
const pendingSetupSecrets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingSetupSecrets) {
    if (now - entry.createdAt > 15 * 60 * 1000) pendingSetupSecrets.delete(token);
  }
}, 60 * 1000).unref();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64);
  return { salt, hash: derived.toString('hex'), encoded: `${salt}:${derived.toString('hex')}` };
}

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
// Tokens de sessão assinados (HMAC-SHA256)
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
    return payload;
  } catch {
    return null;
  }
}

function issueToken(email, stage, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({ sub: email, stage, iat: now, exp: now + ttlSeconds });
}

// ---------------------------------------------------------------------------
// Rate limiting contra força bruta (por IP)
// ---------------------------------------------------------------------------
const loginAttempts = new Map(); // key -> { count, windowStart, lockedUntil }
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function getLockSeconds(key) {
  const entry = loginAttempts.get(key);
  if (!entry?.lockedUntil) return 0;
  const rem = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
  if (rem <= 0) {
    loginAttempts.delete(key);
    return 0;
  }
  return rem;
}

function recordFailure(key) {
  const now = Date.now();
  const prev = loginAttempts.get(key);
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
  loginAttempts.set(key, entry);
  return entry;
}

function clearAttempts(key) {
  loginAttempts.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now - entry.windowStart > WINDOW_MS && (!entry.lockedUntil || entry.lockedUntil < now)) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Aplicação Express
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const clientIp = (req) => req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Estado público do painel (sem segredos)
app.get('/api/admin/status', (_req, res) => {
  res.json({
    version: 2,
    mfaConfigured,
    sessionHours: 8,
  });
});

// Encapsula handlers assíncronos com tratamento de erro
const asyncHandler = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[RelicVault] Erro na API:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });
};

// ETAPA 1 — E-mail + Senha forte
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
  pendingSetupSecrets.set(setupToken, { secret, createdAt: Date.now() });
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
  const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // sessão de 8h
  const sessionToken = issueToken(ADMIN_EMAIL, 'full', 8 * 60 * 60);
  return res.json({ sessionToken, email: ADMIN_EMAIL, expiresAt });
}));

// PRIMEIRO ACESSO — Configuração do MFA (valida o código do autenticador e persiste)
app.post('/api/admin/mfa-setup-confirm', asyncHandler(async (req, res) => {
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
    return res.status(401).json({ error: 'Código incorreto. Digite o código atual exibido no seu autenticador.' });
  }

  persistMfaSecret(pending.secret);
  pendingSetupSecrets.delete(token);

  const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const sessionToken = issueToken(ADMIN_EMAIL, 'full', 8 * 60 * 60);
  return res.json({ sessionToken, email: ADMIN_EMAIL, expiresAt });
}));

// Validação de sessão e logout
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

app.post('/api/admin/logout', requireFullSession, (_req, res) => res.status(204).end());

// ---------------------------------------------------------------------------
// Estático (produção) + fallback SPA
// ---------------------------------------------------------------------------
const distDir = resolve(__dirname, 'dist');

app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));

if (existsSync(distDir)) {
  app.use(express.static(distDir, { index: 'index.html', maxAge: '1h' }));
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
// Inicialização
// ---------------------------------------------------------------------------
async function main() {
  let bootLog = [
    '',
    '==============================================================',
    ' RELICVAULT — MASTER ADMINISTRATOR',
    '==============================================================',
    ` E-mail  : ${ADMIN_EMAIL}`,
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

  if (!process.env.AUTH_SESSION_SECRET) {
    bootLog.push(
      ` AUTH_SESSION_SECRET=${bootstrap.sessionSecret}`,
      '           (gerada agora — defina no .env para manter sessões entre reinícios)'
    );
  }

  bootLog.push('==============================================================', '');
  console.log(bootLog.join('\n'));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RelicVault] Servidor de autenticação e loja em http://localhost:${PORT} (API /api/*)`);
  });
}

main().catch((err) => {
  console.error('[RelicVault] Falha ao iniciar o servidor:', err);
  process.exit(1);
});