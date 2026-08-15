import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const r = Router();

// POST /api/auth/login
r.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Login va parol majburiy' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE login = ?').get(String(login).trim());
  if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  }

  res.json({
    token: signToken(admin),
    admin: { id: admin.id, name: admin.name, login: admin.login, role: admin.role, photo: admin.photo },
  });
});

// GET /api/auth/me — token amal qilishini tekshirish
r.get('/me', requireAuth, (req, res) => {
  const a = db.prepare('SELECT id, name, login, role, photo FROM admins WHERE id = ?').get(req.admin.id);
  if (!a) return res.status(404).json({ error: 'Admin topilmadi' });
  res.json(a);
});

// PUT /api/auth/me — o'z ma'lumotlarini o'zgartirish
// Har qanday rol o'zining ismini, loginini, rasmini va parolini
// o'zgartira oladi. Rolni o'zgartira olmaydi — bu faqat egada.
r.put('/me', requireAuth, (req, res) => {
  const { name, login, photo, currentPassword, newPassword } = req.body || {};

  const me = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!me) return res.status(404).json({ error: 'Admin topilmadi' });

  const nextName = String(name ?? me.name).trim();
  const nextLogin = String(login ?? me.login).trim();

  if (!nextName) return res.status(400).json({ error: 'Ism bo\'sh bo\'lmasin' });
  if (!nextLogin) return res.status(400).json({ error: 'Login bo\'sh bo\'lmasin' });

  // Login band emasligini tekshiramiz
  const taken = db.prepare('SELECT id FROM admins WHERE login = ? AND id <> ?').get(nextLogin, me.id);
  if (taken) return res.status(409).json({ error: 'Bu login band' });

  // Parolni o'zgartirish uchun joriy parol talab qilinadi
  let hash = me.password_hash;
  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), me.password_hash)) {
      return res.status(403).json({ error: 'Joriy parol noto\'g\'ri' });
    }
    if (String(newPassword).length < 4) {
      return res.status(400).json({ error: 'Yangi parol juda qisqa' });
    }
    hash = bcrypt.hashSync(String(newPassword), 10);
  }

  db.prepare(
    'UPDATE admins SET name = ?, login = ?, photo = ?, password_hash = ? WHERE id = ?'
  ).run(nextName, nextLogin, photo ?? me.photo, hash, me.id);

  const updated = db.prepare('SELECT id, name, login, role, photo FROM admins WHERE id = ?').get(me.id);

  // Login o'zgargan bo'lsa token yangilanadi
  res.json({ admin: updated, token: signToken(updated) });
});

export default r;
