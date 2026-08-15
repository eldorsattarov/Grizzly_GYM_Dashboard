import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import paymentRoutes from './routes/payments.js';
import productRoutes from './routes/products.js';
import saleRoutes from './routes/sales.js';
import debtorRoutes from './routes/debtors.js';
import adminRoutes from './routes/admins.js';
import settingRoutes from './routes/settings.js';
import statRoutes from './routes/stats.js';
import siteRoutes from './routes/site.js';

// ---------------------------------------------------------------
// XAVFSIZLIK TEKSHIRUVI
// Standart maxfiy kalit bilan ishlab chiqarishga chiqmaslik kerak
// ---------------------------------------------------------------
const SECRET = process.env.JWT_SECRET || '';
const WEAK = [
  '', 'secret', 'changeme', 'change-me',
  'grizzly-super-secret-change-me',
  'bu-yerga-oz-kalitingizni-yozing',
];

if (WEAK.includes(SECRET) || SECRET.length < 16) {
  console.error('\n  XATO: JWT_SECRET o\'rnatilmagan yoki juda qisqa.');
  console.error('  .env faylida uzun tasodifiy matn yozing, masalan:\n');
  console.error('  JWT_SECRET=' + [...Array(3)].map(() =>
    Math.random().toString(36).slice(2)).join('') + '\n');
  process.exit(1);
}

const app = express();

// Oddiy himoya sarlavhalari — qo'shimcha kutubxonasiz
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Landing va boshqaruv turli domenlarda bo'lishi mumkin —
// CORS_ORIGIN da vergul bilan bir nechtasini yozish mumkin.
const origins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: origins.includes('*') ? '*' : origins,
}));
// Rasm base64 sifatida kelgani uchun limit kattaroq
app.use(express.json({ limit: '6mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------------------------------------------------------------
// LOGIN URINISHLARINI CHEKLASH
// Bir IP dan 15 daqiqada 20 martadan ko'p urinish bloklanadi
// ---------------------------------------------------------------
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_TRIES = 20;

app.use('/api/auth/login', (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);

  if (!rec || now - rec.start > WINDOW) {
    attempts.set(ip, { start: now, count: 1 });
    return next();
  }
  if (rec.count >= MAX_TRIES) {
    const left = Math.ceil((WINDOW - (now - rec.start)) / 60000);
    return res.status(429).json({ error: `Juda ko'p urinish. ${left} daqiqadan keyin qayta urining.` });
  }
  rec.count += 1;
  next();
});

// Eskirgan yozuvlarni tozalab turamiz
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) if (now - rec.start > WINDOW) attempts.delete(ip);
}, WINDOW).unref();

// Ochiq — landing sahifa loginsiz o'qiydi (yozish esa route ichida himoyalangan)
app.use('/api/auth', authRoutes);
app.use('/api/site', siteRoutes);

// Himoyalangan
app.use('/api/members', requireAuth, memberRoutes);
app.use('/api/payments', requireAuth, paymentRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/sales', requireAuth, saleRoutes);
app.use('/api/debtors', requireAuth, debtorRoutes);
app.use('/api/admins', requireAuth, adminRoutes);
app.use('/api/settings', requireAuth, settingRoutes);
app.use('/api/stats', requireAuth, statRoutes);

// ---------------------------------------------------------------
// TAYYOR BOSHQARUV TIZIMI (ixtiyoriy)
//
// Ildiz papkada `npm run build` bajarilgan bo'lsa, server uni ham beradi:
//   http://localhost:4000  →  boshqaruv tizimi
//
// Landing sahifa alohida loyiha — u o'z xostingida turadi va
// bu serverga faqat API orqali murojaat qiladi.
// ---------------------------------------------------------------
const DIST = path.join(__dirname, '..', '..', 'dist');

if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
  console.log('  Boshqaruv    → http://localhost:' + (process.env.PORT || 4000));
}

app.use((_req, res) => res.status(404).json({ error: 'Topilmadi' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatosi', detail: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  Grizzly API  → http://localhost:${PORT}/api`);
  console.log(`  Salomatlik   → http://localhost:${PORT}/api/health\n`);
});

export default app;
