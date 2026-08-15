import { Router } from 'express';
import { db } from '../db.js';

const r = Router();

r.get('/', (_req, res) => {
  res.json(db.prepare('SELECT id, name, price FROM products ORDER BY id DESC').all());
});

r.post('/', (req, res) => {
  const { name, price } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Nom majburiy' });
  const p = Number(price);
  if (!(p >= 0)) return res.status(400).json({ error: 'Narx noto\'g\'ri' });

  const info = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)').run(name.trim(), Math.round(p));
  res.status(201).json(db.prepare('SELECT id, name, price FROM products WHERE id = ?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  const name = (req.body?.name ?? cur.name).trim();
  const price = Math.round(Number(req.body?.price ?? cur.price));
  db.prepare('UPDATE products SET name = ?, price = ? WHERE id = ?').run(name, price, cur.id);
  res.json({ id: cur.id, name, price });
});

r.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  res.json({ ok: true });
});

export default r;
