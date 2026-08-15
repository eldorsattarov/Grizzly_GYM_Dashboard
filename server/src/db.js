import path from 'path';
import { fileURLToPath } from 'url';
import { openDatabase } from './sqlite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'grizzly.db');

export const db = await openDatabase(DB_FILE);

// Foreign key va WAL rejimi — bir vaqtda o'qish/yozish tezroq
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/*
  MUHIM QOIDA — PUL BUTUN SON SIFATIDA SAQLANADI (so'm).
  Kasr son (float) ishlatilmaydi, chunki 0.1 + 0.2 !== 0.3 muammosi
  moliyaviy hisobda xatoga olib keladi.
*/

db.exec(`
  ---------------------------------------------------------------
  -- ADMINLAR
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    login         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('owner', 'admin', 'cashier')),
    photo         TEXT    DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  ---------------------------------------------------------------
  -- SOZLAMALAR (narxlar va boshqalar) — kalit/qiymat
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  ---------------------------------------------------------------
  -- A'ZOLAR
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    phone      TEXT    DEFAULT '',
    photo      TEXT    DEFAULT '',
    type       TEXT    NOT NULL DEFAULT 'daily'
               CHECK (type IN ('daily', 'alternate')),
    amount     INTEGER NOT NULL,          -- oylik narx (yozilgan paytdagi)
    start_date TEXT    NOT NULL,          -- YYYY-MM-DD
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);

  ---------------------------------------------------------------
  -- A'ZOLIK TO'LOVLARI (faqat qo'shiladi, o'chirilmaydi)
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS payments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount    INTEGER NOT NULL CHECK (amount > 0),
    paid_at   TEXT    NOT NULL,           -- YYYY-MM-DDTHH:mm
    method    TEXT    NOT NULL DEFAULT 'cash',  -- cash | card (faqat ma'lumot uchun)
    admin_id  INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    note      TEXT    DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
  CREATE INDEX IF NOT EXISTS idx_payments_date   ON payments(paid_at);

  ---------------------------------------------------------------
  -- MAHSULOTLAR
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    price      INTEGER NOT NULL CHECK (price >= 0),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  ---------------------------------------------------------------
  -- SOTUVLAR
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS sales (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
    buyer_name TEXT    DEFAULT NULL,      -- NULL = kunlik a'zo
    total      INTEGER NOT NULL,
    paid       INTEGER NOT NULL DEFAULT 0,
    method     TEXT    NOT NULL DEFAULT 'cash',  -- boshlang'ich to'lov usuli
    sold_at    TEXT    NOT NULL,          -- YYYY-MM-DD
    admin_id   INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sales_date   ON sales(sold_at);
  CREATE INDEX IF NOT EXISTS idx_sales_member ON sales(member_id);

  ---------------------------------------------------------------
  -- SOTUV TARKIBI (savat)
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS sale_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT    NOT NULL,        -- nusxa: mahsulot o'chsa ham tarix qoladi
    qty          INTEGER NOT NULL CHECK (qty > 0),
    unit_price   INTEGER NOT NULL,        -- nusxa: narx o'zgarsa ham tarix qoladi
    total        INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

  ---------------------------------------------------------------
  -- SOTUV QARZI TO'LOVLARI
  ---------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS sale_payments (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id  INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    amount   INTEGER NOT NULL CHECK (amount > 0),
    paid_at  TEXT    NOT NULL,
    method   TEXT    NOT NULL DEFAULT 'cash',
    admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL
  );
`);

// ---------------------------------------------------------------
// MIGRATSIYA — eski bazalarga yangi ustunlarni qo'shadi
// Ustun allaqachon bo'lsa xato beradi, uni jimgina o'tkazamiz.
// ---------------------------------------------------------------
const addColumn = (table, column, definition) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

addColumn('payments',      'method', "TEXT NOT NULL DEFAULT 'cash'");
addColumn('sales',         'method', "TEXT NOT NULL DEFAULT 'cash'");
addColumn('sale_payments', 'method', "TEXT NOT NULL DEFAULT 'cash'");

// Standart sozlamalar
const setDefault = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING'
);
setDefault.run('price_daily', '300000');
setDefault.run('price_alternate', '180000');

export const getSetting = (key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;

export const setSetting = (key, value) =>
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));

export const getPrices = () => ({
  daily: Number(getSetting('price_daily')),
  alternate: Number(getSetting('price_alternate')),
});
