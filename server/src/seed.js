import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, getPrices } from './db.js';

const has = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (has > 0) {
  console.log('Ma\'lumotlar allaqachon mavjud. Tozalash uchun grizzly.db faylini o\'chiring.');
  process.exit(0);
}

const prices = getPrices();
const iso = (d) => d.toISOString().slice(0, 16);
const day = (d) => d.toISOString().slice(0, 10);
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };

db.transaction(() => {
  // Adminlar
  db.prepare('INSERT INTO admins (name, login, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Elyor Saidov', 'admin', bcrypt.hashSync('admin123', 10), 'owner');
  db.prepare('INSERT INTO admins (name, login, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Nodira Yusupova', 'kassir', bcrypt.hashSync('kassir123', 10), 'cashier');

  // Mahsulotlar
  const prod = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)');
  const pIds = [
    prod.run('Suv 0.5L', 5000).lastInsertRowid,
    prod.run('Protein kokteyl', 35000).lastInsertRowid,
    prod.run('Energetik ichimlik', 15000).lastInsertRowid,
    prod.run('Sport qo\'lqop', 90000).lastInsertRowid,
  ];

  // A'zolar
  const addMember = db.prepare(
    'INSERT INTO members (name, phone, type, amount, start_date) VALUES (?, ?, ?, ?, ?)'
  );
  const addPay = db.prepare(
    'INSERT INTO payments (member_id, amount, paid_at, admin_id) VALUES (?, ?, ?, 1)'
  );

  const m1 = addMember.run('Abdullayev Uzbek', '+998901234567', 'daily', prices.daily, day(monthsAgo(2))).lastInsertRowid;
  addPay.run(m1, prices.daily, iso(monthsAgo(2)));
  addPay.run(m1, prices.daily, iso(monthsAgo(1)));
  addPay.run(m1, prices.daily, iso(new Date()));

  const m2 = addMember.run('Qodirova Nilufar', '+998902345678', 'alternate', prices.alternate, day(monthsAgo(2))).lastInsertRowid;
  addPay.run(m2, prices.alternate, iso(monthsAgo(2)));
  addPay.run(m2, 100000, iso(monthsAgo(1)));

  const m3 = addMember.run('Karimov Alisher', '+998903456789', 'daily', prices.daily, day(monthsAgo(3))).lastInsertRowid;
  addPay.run(m3, prices.daily, iso(monthsAgo(3)));

  const m4 = addMember.run('Xolova Gulnora', '+998904567890', 'alternate', prices.alternate, day(monthsAgo(1))).lastInsertRowid;
  addPay.run(m4, prices.alternate, iso(monthsAgo(1)));
  addPay.run(m4, 60000, iso(new Date()));

  // Sotuvlar
  const addSale = db.prepare(
    'INSERT INTO sales (member_id, buyer_name, total, paid, sold_at, admin_id) VALUES (?, ?, ?, ?, ?, 1)'
  );
  const addItem = db.prepare(
    'INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const addSalePay = db.prepare(
    'INSERT INTO sale_payments (sale_id, amount, paid_at, admin_id) VALUES (?, ?, ?, 1)'
  );
  const today = day(new Date());

  const s1 = addSale.run(m1, 'Abdullayev Uzbek', 15000, 15000, today).lastInsertRowid;
  addItem.run(s1, pIds[0], 'Suv 0.5L', 3, 5000, 15000);
  addSalePay.run(s1, 15000, iso(new Date()));

  const s2 = addSale.run(m2, 'Qodirova Nilufar', 65000, 20000, today).lastInsertRowid;
  addItem.run(s2, pIds[1], 'Protein kokteyl', 1, 35000, 35000);
  addItem.run(s2, pIds[2], 'Energetik ichimlik', 2, 15000, 30000);
  addSalePay.run(s2, 20000, iso(new Date()));
})();

console.log('Boshlang\'ich ma\'lumotlar yozildi.');
console.log('Login: admin / admin123   (egasi)');
console.log('Login: kassir / kassir123 (kassir)');
