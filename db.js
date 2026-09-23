/**
 * RelicVault — Camada de persistência (SQLite via better-sqlite3)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guarda produtos, pedidos, leads e configurações do site fora do navegador
 * (substitui o localStorage como fonte de verdade quando o servidor está no ar).
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, chmodSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');
const DB_FILE = resolve(DATA_DIR, 'relicvault.db');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Permissões restritas no arquivo do banco (apenas o dono lê/escreve)
try {
  chmodSync(DB_FILE, 0o600);
} catch {
  /* melhor esforço */
}

export function closeDb() {
  try {
    db.close();
  } catch {
    /* já fechado */
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT 'tcg',
    rarity            TEXT NOT NULL DEFAULT 'raro',
    condition         TEXT NOT NULL DEFAULT '',
    year              INTEGER NOT NULL DEFAULT 2024,
    price             REAL NOT NULL DEFAULT 0,
    original_price    REAL,
    stock             INTEGER NOT NULL DEFAULT 0,
    featured          INTEGER NOT NULL DEFAULT 0,
    image             TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    authenticity_cert TEXT NOT NULL DEFAULT '',
    franchise         TEXT NOT NULL DEFAULT '',
    specs_json        TEXT NOT NULL DEFAULT '[]',
    published         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    data_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,
    status         TEXT NOT NULL DEFAULT 'pending_payment',
    customer_json  TEXT NOT NULL,
    items_json     TEXT NOT NULL,
    subtotal       REAL NOT NULL DEFAULT 0,
    shipping       REAL NOT NULL DEFAULT 0,
    discount       REAL NOT NULL DEFAULT 0,
    total          REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'pix',
    payment_details_json TEXT NOT NULL DEFAULT '{}',
    tracking_code  TEXT NOT NULL DEFAULT '',
    history_json   TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    item_id    TEXT NOT NULL DEFAULT '',
    item_name  TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// Helpers de serialização
// ---------------------------------------------------------------------------
const toProduct = (row) => {
  if (!row) return null;
  let specs = [];
  try {
    const parsed = JSON.parse(row.specs_json || '[]');
    if (Array.isArray(parsed)) specs = parsed;
  } catch {
    /* specs inválidas ficam vazias */
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    rarity: row.rarity,
    condition: row.condition,
    year: row.year,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    stock: row.stock,
    featured: !!row.featured,
    image: row.image,
    description: row.description,
    authenticityCert: row.authenticity_cert,
    franchise: row.franchise,
    specs,
  };
};

// Imagens: apenas data:image/* (upload local) ou URLs http(s)/caminhos locais.
// Bloqueia javascript:, data:text/html e outros esquemas perigosos.
const sanitizeImageUrl = (value) => {
  const v = String(value || '').slice(0, 3000);
  if (!v) return '';
  if (/^data:image\/(png|jpe?g|webp|gif|avif)/i.test(v)) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\//.test(v)) return v; // assets locais (hero, ícones)
  return '';
};

const fromProduct = (p) => ({
  id: p?.id ? String(p.id) : randomUUID(),
  name: String(p.name || '').slice(0, 300),
  category: String(p.category || 'tcg'),
  rarity: String(p.rarity || 'raro'),
  condition: String(p.condition || '').slice(0, 200),
  year: Number(p.year) || 2024,
  price: Number(p.price) || 0,
  original_price: p.originalPrice != null ? Number(p.originalPrice) : null,
  stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
  featured: p.featured ? 1 : 0,
  image: sanitizeImageUrl(p.image),
  description: String(p.description || '').slice(0, 5000),
  authenticity_cert: String(p.authenticityCert || '').slice(0, 500),
  franchise: String(p.franchise || '').slice(0, 200),
  specs_json: JSON.stringify(
    (Array.isArray(p.specs) ? p.specs : [])
      .slice(0, 40)
      .map((s) => ({ label: String(s?.label || '').slice(0, 120), value: String(s?.value || '').slice(0, 300) }))
  ),
  published: p.published === false ? 0 : 1,
});

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------
export const listProducts = (opts = {}) => {
  const { publishedOnly = true } = opts;
  const rows = publishedOnly
    ? db.prepare('SELECT * FROM products WHERE published = 1 ORDER BY featured DESC, created_at DESC, rowid DESC').all()
    : db.prepare('SELECT * FROM products ORDER BY created_at DESC, rowid DESC').all();
  return rows.map(toProduct);
};

export const getProduct = (id) => toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(String(id)));

export const upsertProduct = (p) => {
  const row = fromProduct(p);
  db.prepare(`
    INSERT INTO products (id, name, category, rarity, condition, year, price, original_price, stock, featured, image, description, authenticity_cert, franchise, specs_json, published, created_at, updated_at)
    VALUES (@id, @name, @category, @rarity, @condition, @year, @price, @original_price, @stock, @featured, @image, @description, @authenticity_cert, @franchise, @specs_json, @published, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = @name, category = @category, rarity = @rarity, condition = @condition,
      year = @year, price = @price, original_price = @original_price, stock = @stock,
      featured = @featured, image = @image, description = @description,
      authenticity_cert = @authenticity_cert, franchise = @franchise, specs_json = @specs_json,
      published = @published, updated_at = datetime('now')
  `).run(row);
  return getProduct(row.id);
};

export const deleteProduct = (id) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(String(id));
};

export const countProducts = () => db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

export const replaceAllProducts = (items) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO products (id, name, category, rarity, condition, year, price, original_price, stock, featured, image, description, authenticity_cert, franchise, specs_json, published, created_at, updated_at)
    VALUES (@id, @name, @category, @rarity, @condition, @year, @price, @original_price, @stock, @featured, @image, @description, @authenticity_cert, @franchise, @specs_json, @published, datetime('now'), datetime('now'))
  `);
  const tx = db.transaction((list) => {
    db.prepare('DELETE FROM products').run();
    for (const p of list) insert.run(fromProduct(p));
  });
  tx(items);
};

// ---------------------------------------------------------------------------
// Settings (linha única)
// ---------------------------------------------------------------------------
export const getSettings = () => {
  const row = db.prepare('SELECT data_json FROM settings WHERE id = 1').get();
  if (!row) return null;
  try {
    return JSON.parse(row.data_json);
  } catch {
    return null;
  }
};

export const saveSettings = (data) => {
  const json = JSON.stringify(data ?? {});
  db.prepare(`
    INSERT INTO settings (id, data_json, updated_at) VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = datetime('now')
  `).run(json);
  return getSettings();
};

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export const listOrders = () => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY datetime(created_at) DESC, rowid DESC').all();
  return rows.map((row) => {
    let customer = {};
    let items = [];
    let paymentDetails = {};
    let history = [];
    try { customer = JSON.parse(row.customer_json || '{}'); } catch { /* ignore */ }
    try { items = JSON.parse(row.items_json || '[]'); } catch { /* ignore */ }
    try { paymentDetails = JSON.parse(row.payment_details_json || '{}'); } catch { /* ignore */ }
    try { history = JSON.parse(row.history_json || '[]'); } catch { /* ignore */ }
    return {
      id: row.id,
      createdAt: row.created_at,
      customer,
      items,
      subtotal: row.subtotal,
      shipping: row.shipping,
      discount: row.discount,
      total: row.total,
      paymentMethod: row.payment_method,
      paymentDetails,
      status: row.status,
      trackingCode: row.tracking_code,
      history,
    };
  });
};

export const getOrder = (id) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(String(id));
  if (!row) return null;
  return listOrders().find((o) => o.id === String(id));
};

export const createOrder = (order) => {
  db.prepare(`
    INSERT INTO orders (id, status, customer_json, items_json, subtotal, shipping, discount, total, payment_method, payment_details_json, tracking_code, history_json, created_at, updated_at)
    VALUES (@id, @status, @customer_json, @items_json, @subtotal, @shipping, @discount, @total, @payment_method, @payment_details_json, @tracking_code, @history_json, datetime('now'), datetime('now'))
  `).run({
    id: String(order.id),
    status: order.status || 'pending_payment',
    customer_json: JSON.stringify(order.customer || {}),
    items_json: JSON.stringify(order.items || []),
    subtotal: Number(order.subtotal) || 0,
    shipping: Number(order.shipping) || 0,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    payment_method: order.paymentMethod || 'pix',
    payment_details_json: JSON.stringify(order.paymentDetails || {}),
    tracking_code: order.trackingCode || '',
    history_json: JSON.stringify(order.history || []),
  });
  return getOrder(order.id);
};

export const updateOrder = (id, patch) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(String(id));
  if (!existing) return null;
  const next = {
    ...existing,
    ...patch,
    customer_json: patch.customer ? JSON.stringify(patch.customer) : existing.customer_json,
    items_json: patch.items ? JSON.stringify(patch.items) : existing.items_json,
    payment_details_json: patch.paymentDetails ? JSON.stringify(patch.paymentDetails) : existing.payment_details_json,
    history_json: patch.history ? JSON.stringify(patch.history) : existing.history_json,
  };
  db.prepare(`
    UPDATE orders SET
      status = @status, customer_json = @customer_json, items_json = @items_json,
      subtotal = @subtotal, shipping = @shipping, discount = @discount, total = @total,
      payment_method = @payment_method, payment_details_json = @payment_details_json,
      tracking_code = @tracking_code, history_json = @history_json, updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: next.id,
    status: next.status,
    customer_json: next.customer_json,
    items_json: next.items_json,
    subtotal: next.subtotal,
    shipping: next.shipping,
    discount: next.discount,
    total: next.total,
    payment_method: next.payment_method,
    payment_details_json: next.payment_details_json,
    tracking_code: next.tracking_code,
    history_json: next.history_json,
  });
  return getOrder(id);
};

// ---------------------------------------------------------------------------
// Leads (interesse / "avise-me")
// ---------------------------------------------------------------------------
export const createLead = (lead) => {
  const info = db.prepare(`
    INSERT INTO leads (name, email, phone, item_id, item_name, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'new', datetime('now'))
  `).run(
    String(lead.name || '').slice(0, 200),
    String(lead.email || '').slice(0, 200),
    String(lead.phone || '').slice(0, 40),
    String(lead.itemId || '').slice(0, 100),
    String(lead.itemName || '').slice(0, 300),
    String(lead.message || '').slice(0, 2000)
  );
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid);
};

export const listLeads = () => db.prepare('SELECT * FROM leads ORDER BY datetime(created_at) DESC, id DESC').all();

export const updateLeadStatus = (id, status) => {
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(String(status), Number(id));
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(id));
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
export const dbHealth = () => {
  try {
    db.prepare('SELECT 1 AS ok').get();
    return { ok: true, db: DB_FILE };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const counts = () => ({
  products: countProducts(),
  orders: db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,
  leads: db.prepare('SELECT COUNT(*) AS n FROM leads').get().n,
});