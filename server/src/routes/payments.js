import { Router } from 'express';
import { db } from '../db.js';
import { enrichMember, normMethod } from '../logic.js';

const r = Router();

// POST /api/payments — a'zolik to'lovini qabul qilish
r.post('/', (req, res) => {
  const { memberId, amount, paidAt, note = '', method = 'cash' } = req.body || {};
  const sum = Number(amount);

  if (!memberId) return res.status(400).json({ error: 'A\'zo tanlanmagan' });
  if (!sum || sum <= 0) return res.status(400).json({ error: 'To\'lov summasi noto\'g\'ri' });

  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
  if (!m) return res.status(404).json({ error: 'A\'zo topilmadi' });

  db.prepare(
    'INSERT INTO payments (member_id, amount, paid_at, method, admin_id, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(m.id, Math.round(sum), paidAt || new Date().toISOString().slice(0, 16), normMethod(method), req.admin.id, note);

  res.status(201).json(enrichMember(db.prepare('SELECT * FROM members WHERE id = ?').get(m.id), true));
});

// GET /api/payments?from=&to=
r.get('/', (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT p.id, p.amount, p.paid_at AS paidAt, p.note, p.method,
                    m.id AS memberId, m.name AS memberName
               FROM payments p JOIN members m ON m.id = p.member_id`;
  const args = [];
  if (from && to) { sql += ' WHERE p.paid_at BETWEEN ? AND ?'; args.push(from, to); }
  sql += ' ORDER BY p.paid_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...args));
});

export default r;
