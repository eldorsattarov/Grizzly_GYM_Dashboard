import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireRole } from '../auth.js';

const r = Router();
const pub = 'id, name, login, role, photo, created_at AS createdAt';

r.get('/', (_req, res) => {
  res.json(db.prepare(`SELECT ${pub} FROM admins ORDER BY id DESC`).all());
});

r.post('/', requireRole('owner'), (req, res) => {
  const { name, login, password, role = 'admin', photo = '' } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Ism majburiy' });
  if (!login?.trim()) return res.status(400).json({ error: 'Login majburiy' });
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'Parol kamida 4 belgi' });
  }
  if (!['owner', 'admin', 'cashier'].includes(role)) {
    return res.status(400).json({ error: 'Rol noto\'g\'ri' });
  }
  if (db.prepare('SELECT 1 FROM admins WHERE login = ?').get(login.trim())) {
    return res.status(409).json({ error: 'Bu login band' });
  }

  const info = db.prepare(
    'INSERT INTO admins (name, login, password_hash, role, photo) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), login.trim(), bcrypt.hashSync(String(password), 10), role, photo);

  res.status(201).json(db.prepare(`SELECT ${pub} FROM admins WHERE id = ?`).get(info.lastInsertRowid));
});

r.put('/:id', requireRole('owner'), (req, res) => {
  const cur = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Admin topilmadi' });

  const name = (req.body?.name ?? cur.name).trim();
  const login = (req.body?.login ?? cur.login).trim();
  const role = req.body?.role ?? cur.role;
  const photo = req.body?.photo ?? cur.photo;

  const taken = db.prepare('SELECT 1 FROM admins WHERE login = ? AND id <> ?').get(login, cur.id);
  if (taken) return res.status(409).json({ error: 'Bu login band' });

  // Oxirgi egasini rolini o'zgartirishga yo'l qo'ymaymiz
  if (cur.role === 'owner' && role !== 'owner') {
    const owners = db.prepare("SELECT COUNT(*) AS c FROM admins WHERE role = 'owner'").get().c;
    if (owners <= 1) return res.status(400).json({ error: 'Kamida bitta egasi qolishi kerak' });
  }

  const hash = req.body?.password
    ? bcrypt.hashSync(String(req.body.password), 10)
    : cur.password_hash;

  db.prepare(
    'UPDATE admins SET name = ?, login = ?, role = ?, photo = ?, password_hash = ? WHERE id = ?'
  ).run(name, login, role, photo, hash, cur.id);

  res.json(db.prepare(`SELECT ${pub} FROM admins WHERE id = ?`).get(cur.id));
});

r.delete('/:id', requireRole('owner'), (req, res) => {
  const cur = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Admin topilmadi' });
  if (cur.role === 'owner') {
    const owners = db.prepare("SELECT COUNT(*) AS c FROM admins WHERE role = 'owner'").get().c;
    if (owners <= 1) return res.status(400).json({ error: 'Oxirgi egasini o\'chirib bo\'lmaydi' });
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(cur.id);
  res.json({ ok: true });
});

export default r;
