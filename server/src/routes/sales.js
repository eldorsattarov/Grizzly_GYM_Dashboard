import { Router } from 'express';
import { db } from '../db.js';
import { enrichSale, normMethod } from '../logic.js';

const r = Router();

// GET /api/sales?search=&date=
r.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 500').all();
  let list = rows.map(enrichSale);

  const q = String(req.query.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        (s.buyer || '').toLowerCase().includes(q) ||
        s.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }
  if (req.query.date) list = list.filter((s) => s.date === req.query.date);

  res.json(list);
});

/*
  POST /api/sales
  {
    items: [{ productId, qty }],
    buyer: "Ism" | null,
    paid: 40000        // kiritilmasa = to'liq summa
  }
  Narx serverdan olinadi — mijoz uni o'zgartira olmaydi.
*/
r.post('/', (req, res) => {
  const { items, buyer = null, paid, soldAt , method = 'cash' } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Savat bo\'sh' });
  }

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const prepared = [];
  for (const it of items) {
    const p = getProduct.get(it.productId);
    if (!p) return res.status(400).json({ error: `Mahsulot topilmadi: ${it.productId}` });
    const qty = Math.max(1, Math.round(Number(it.qty) || 1));
    prepared.push({ p, qty, total: p.price * qty });
  }

  const total = prepared.reduce((a, x) => a + x.total, 0);
  const paidNow = paid === undefined || paid === null || paid === ''
    ? total
    : Math.max(0, Math.min(total, Math.round(Number(paid) || 0)));

  const member = buyer
    ? db.prepare('SELECT id FROM members WHERE name = ?').get(buyer)
    : null;

  const tx = db.transaction(() => {
    const info = db.prepare(
      `INSERT INTO sales (member_id, buyer_name, total, paid, method, sold_at, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      member?.id ?? null,
      buyer || null,
      total,
      paidNow,
      normMethod(method),
      (soldAt || new Date().toISOString()).slice(0, 10),
      req.admin.id
    );

    const addItem = db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, total)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const x of prepared) {
      addItem.run(info.lastInsertRowid, x.p.id, x.p.name, x.qty, x.p.price, x.total);
    }
    if (paidNow > 0) {
      db.prepare(
        'INSERT INTO sale_payments (sale_id, amount, paid_at, method, admin_id) VALUES (?, ?, ?, ?, ?)'
      ).run(info.lastInsertRowid, paidNow, new Date().toISOString().slice(0, 16), normMethod(method), req.admin.id);
    }
    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json(enrichSale(db.prepare('SELECT * FROM sales WHERE id = ?').get(id)));
});

// POST /api/sales/:id/pay — qarzni to'lash
r.post('/:id/pay', (req, res) => {
  const s = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Sotuv topilmadi' });

  const debt = Math.max(0, s.total - s.paid);
  const add = Math.max(0, Math.min(debt, Math.round(Number(req.body?.amount) || 0)));
  const payMethod = normMethod(req.body?.method);
  if (add <= 0) return res.status(400).json({ error: 'To\'lov summasi noto\'g\'ri' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE sales SET paid = paid + ? WHERE id = ?').run(add, s.id);
    db.prepare(
      'INSERT INTO sale_payments (sale_id, amount, paid_at, method, admin_id) VALUES (?, ?, ?, ?, ?)'
    ).run(s.id, add, new Date().toISOString().slice(0, 16), payMethod, req.admin.id);
  });
  tx();

  res.json(enrichSale(db.prepare('SELECT * FROM sales WHERE id = ?').get(s.id)));
});

r.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Sotuv topilmadi' });
  res.json({ ok: true });
});

export default r;
