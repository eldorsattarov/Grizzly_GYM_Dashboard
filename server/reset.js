// ============================================================
// MA'LUMOTLARNI TOZALASH
//
// A'zolar, to'lovlar, mahsulotlar va sotuvlarni o'chiradi —
// tizimni noldan boshlash uchun.
//
// SAQLANADI:
//   · adminlar va parollar
//   · narxlar
//   · sayt sozlamalari (landing mazmuni, rasmlar)
//
// Ishlatish:
//   npm run reset
// ============================================================

import 'dotenv/config';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { db } from './src/db.js';

const TABLES = ['sale_payments', 'sale_items', 'sales', 'payments', 'members', 'products'];

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

console.log('\nHozirgi holat:\n');
const before = {};
for (const t of TABLES) {
  before[t] = count(t);
  console.log(`  ${t.padEnd(16)} ${before[t]}`);
}

const total = Object.values(before).reduce((a, b) => a + b, 0);

if (total === 0) {
  console.log('\nBaza allaqachon bo\'sh — tozalash shart emas.\n');
  process.exit(0);
}

console.log('\nSaqlanadi:');
console.log(`  adminlar         ${count('admins')}`);
console.log('  narxlar va sayt sozlamalari\n');

// ---- Avval zaxira nusxa ----
const dbFile = process.env.DB_FILE || './grizzly.db';
if (fs.existsSync(dbFile)) {
  const dir = 'backups';
  fs.mkdirSync(dir, { recursive: true });
  const p2 = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}-${p2(d.getMinutes())}`;
  const dest = path.join(dir, `grizzly-tozalashdan-oldin-${stamp}.db`);
  fs.copyFileSync(dbFile, dest);
  console.log(`Zaxira nusxa olindi: ${dest}\n`);
}

// ---- Tasdiqlash ----
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Hammasi o'chirilsinmi? Tasdiqlash uchun HA deb yozing: ", (answer) => {
  rl.close();

  if (answer.trim().toUpperCase() !== 'HA') {
    console.log('\nBekor qilindi. Hech narsa o\'chirilmadi.\n');
    process.exit(0);
  }

  const wipe = db.transaction(() => {
    for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run();
    // Identifikatorlar 1 dan boshlanishi uchun
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('members','payments','products','sales','sale_items','sale_payments')").run();
    } catch {
      /* sqlite_sequence bo'lmasligi mumkin */
    }
  });

  wipe();

  console.log('\nTozalandi:\n');
  for (const t of TABLES) console.log(`  ${t.padEnd(16)} ${before[t]} → ${count(t)}`);
  console.log(`\n  adminlar saqlandi: ${count('admins')}`);
  console.log('  sayt sozlamalari saqlandi\n');
  console.log('Serverni qayta ishga tushiring:  pm2 restart grizzly\n');
});
