import { Router } from 'express';
import { db } from '../db.js';
import { enrichMember, enrichSale } from '../logic.js';

const r = Router();

// GET /api/debtors — a'zolik va sotuv qarzlari birlashtirilgan
r.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM members').all().map((m) => enrichMember(m));

  const saleDebtByMember = db.prepare(
    `SELECT member_id AS id, SUM(total - paid) AS debt
       FROM sales WHERE total > paid AND member_id IS NOT NULL GROUP BY member_id`
  ).all();
  const byId = Object.fromEntries(saleDebtByMember.map((x) => [x.id, x.debt]));

  const rows = members
    .map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      photo: m.photo,
      memberDebt: m.debt,
      saleDebt: byId[m.id] || 0,
    }))
    .filter((x) => x.memberDebt > 0 || x.saleDebt > 0);

  // Kunlik a'zolarning (buyer_name NULL) sotuv qarzi
  const guest = db.prepare(
    'SELECT COALESCE(SUM(total - paid), 0) AS debt FROM sales WHERE total > paid AND member_id IS NULL'
  ).get().debt;

  if (guest > 0) {
    rows.push({ id: 'guest', name: null, phone: '', photo: '', memberDebt: 0, saleDebt: guest });
  }

  const list = rows
    .map((x) => ({ ...x, total: x.memberDebt + x.saleDebt }))
    .sort((a, b) => b.total - a.total);

  const q = String(req.query.search || '').trim().toLowerCase();
  res.json(q ? list.filter((x) => (x.name || '').toLowerCase().includes(q) || x.phone.includes(q)) : list);
});

// GET /api/debtors/:id/sales — shu xaridorning to'lanmagan sotuvlari
r.get('/:id/sales', (req, res) => {
  const id = req.params.id;
  const rows = id === 'guest'
    ? db.prepare('SELECT * FROM sales WHERE total > paid AND member_id IS NULL ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM sales WHERE total > paid AND member_id = ? ORDER BY id DESC').all(id);
  res.json(rows.map(enrichSale));
});

export default r;
