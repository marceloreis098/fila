#!/usr/bin/env node
/**
 * RelicVault — Gerador de credenciais do Master Administrator
 * SPDX-License-Identifier: Apache-2.0
 *
 * Uso:
 *   npm run gen-secret
 *   npm run gen-secret -- --email admin@meudominio.com.br
 *   npm run gen-secret -- --email admin@meudominio.com.br --password MinhaSenhaForte#2026
 *
 * Imprime um bloco pronto para colar no .env, incluindo QR code para
 * cadastrar a chave TOTP no aplicativo autenticador.
 */

import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { generateSecret, generateURI } from 'otplib';

function parseArgs(argv) {
  const args = { email: null, password: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') args.email = argv[i + 1] || null;
    if (argv[i] === '--password') args.password = argv[i + 1] || null;
  }
  return args;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function main() {
  const { email: emailArg, password: passwordArg } = parseArgs(process.argv.slice(2));

  const email = (emailArg || 'admin@relicvault.com.br').trim().toLowerCase();
  const password = passwordArg || crypto.randomBytes(18).toString('base64url'); // ~24 chars

  if (password.length < 12) {
    console.error('A senha informada tem menos de 12 caracteres. Use uma senha mais forte.');
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const totpSecret = generateSecret();
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const uri = generateURI({ issuer: 'RelicVault', label: `Master Admin (${email})`, secret: totpSecret });
  const qr = await QRCode.toString(uri, { type: 'terminal', small: true }).catch(() => '');

  const block = `=============================================================
 RELICVAULT — CREDENCIAIS DO MASTER ADMINISTRATOR
 Copie e cole no seu arquivo .env (ou no painel de Secrets):
=============================================================
ADMIN_EMAIL="${email}"
ADMIN_PASSWORD_HASH="${passwordHash}"
ADMIN_TOTP_SECRET="${totpSecret}"
AUTH_SESSION_SECRET="${sessionSecret}"
=============================================================
 Senha em texto plano (guarde em local seguro — NÃO é armazenada):
   ${password}
=============================================================
 QR CODE — escaneie no app autenticador (Google Authenticator/Authy):
${qr}
   otpauth: ${uri}
=============================================================`;

  console.log(block);
}

main().catch((err) => {
  console.error('Falha ao gerar credenciais:', err);
  process.exit(1);
});