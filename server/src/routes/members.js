import { Router } from 'express';
import { db, getPrices } from '../db.js';
import { enrichMember, normMethod } from '../logic.js';

const r = Router();

// GET /api/members?search=&filter=
r.get('/', (req, res) => {
  // Yangi qo'shilgan a'zo ro'yxatda birinchi ko'rinadi
  const rows = db.prepare('SELECT * FROM members ORDER BY id DESC').all();
  let list = rows.map((m) => enrichMember(m));

  const q = String(req.query.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter((m) => m.name.toLowerCase().includes(q) || m.phone.includes(q));
  }

  const f = req.query.filter;
  if (f && f !== 'all') {
    list = list.filter((m) => m.type === f || m.status === f);
  }

  res.json(list);
});

// GET /api/members/:id — to'lovlar tarixi bilan
r.get('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'A\'zo topilmadi' });
  res.json(enrichMember(m, true));
});

// POST /api/members
r.post('/', (req, res) => {
  const { name, phone = '', photo = '', type = 'daily', startDate,
          initialPaid = 0, paidAt, method = 'cash' } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Ism majburiy' });
  if (!['daily', 'alternate'].includes(type)) return res.status(400).json({ error: 'Tur noto\'g\'ri' });

  const prices = getPrices();
  const start = (startDate || new Date().toISOString()).slice(0, 10);

  const tx = db.transaction(() => {
    const info = db.prepare(
      `INSERT INTO members (name, phone, photo, type, amount, start_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(name.trim(), phone, photo, type, prices[type], start);

    const paid = Math.max(0, Number(initialPaid) || 0);
    if (paid > 0) {
      db.prepare(
        'INSERT INTO payments (member_id, amount, paid_at, method, admin_id) VALUES (?, ?, ?, ?, ?)'
      ).run(info.lastInsertRowid, paid, paidAt || new Date().toISOString().slice(0, 16), normMethod(method), req.admin.id);
    }
    return info.lastInsertRowid;
  });

  const id = tx();
  res.status(201).json(enrichMember(db.prepare('SELECT * FROM members WHERE id = ?').get(id), true));
});

// PUT /api/members/:id — to'lovlar tarixiga tegilmaydi
r.put('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'A\'zo topilmadi' });

  const { name = m.name, phone = m.phone, photo = m.photo, type = m.type, startDate = m.start_date } = req.body || {};
  const prices = getPrices();
  const amount = type !== m.type ? prices[type] : m.amount;

  db.prepare(
    `UPDATE members SET name = ?, phone = ?, photo = ?, type = ?, amount = ?, start_date = ? WHERE id = ?`
  ).run(name.trim(), phone, photo, type, amount, String(startDate).slice(0, 10), m.id);

  res.json(enrichMember(db.prepare('SELECT * FROM members WHERE id = ?').get(m.id), true));
});

// DELETE /api/members/:id
r.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'A\'zo topilmadi' });
  res.json({ ok: true });
});

export default r;
