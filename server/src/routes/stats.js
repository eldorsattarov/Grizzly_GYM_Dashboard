import { Router } from 'express';
import { db } from '../db.js';
import { enrichMember, periodRange } from '../logic.js';

const r = Router();

/*
  MUHIM: DAROMAD FAQAT HAQIQATDA KELGAN PULDAN HISOBLANADI.
  Qarz (hisoblangan − to'langan) hech qachon daromadga qo'shilmaydi.
  U to'langanda payments / sale_payments jadvaliga tushadi va
  o'shanda avtomatik daromadga kiradi.
*/

// GET /api/stats/overview
r.get('/overview', (_req, res) => {
  const members = db.prepare('SELECT * FROM members').all().map((m) => enrichMember(m));

  const membershipIncome = db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM payments').get().s;
  const salesIncome = db.prepare('SELECT COALESCE(SUM(paid), 0) AS s FROM sales').get().s;
  const salesDebt = db.prepare('SELECT COALESCE(SUM(total - paid), 0) AS s FROM sales WHERE total > paid').get().s;

  // To'lov usuli bo'yicha taqsimot — faqat ko'rsatish uchun,
  // umumiy daromadga ta'sir qilmaydi.
  const byMethod = (method) => {
    const a = db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE method = ?').get(method).s;
    const b = db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM sale_payments WHERE method = ?').get(method).s;
    return a + b;
  };

  res.json({
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status !== 'overdue').length,
    overdueMembers: members.filter((m) => m.status === 'overdue').length,
    debtors: members.filter((m) => m.status === 'partial').length,
    membershipDebt: members.reduce((a, m) => a + m.debt, 0),
    salesDebt,
    membershipIncome,
    salesIncome,
    totalIncome: membershipIncome + salesIncome,
    cashIncome: byMethod('cash'),
    cardIncome: byMethod('card'),
  });
});

// GET /api/stats/period?date=2026-08-10&period=day|week|month|year
r.get('/period', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const period = ['day', 'week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'day';
  const { from, to } = periodRange(date, period);

  const membership = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE paid_at BETWEEN ? AND ?'
  ).get(from, to).s;

  // Davrdagi to'lovlar usul bo'yicha
  const periodByMethod = (method) => {
    const a = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE method = ? AND paid_at BETWEEN ? AND ?'
    ).get(method, from, to).s;
    const b = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM sale_payments WHERE method = ? AND paid_at BETWEEN ? AND ?'
    ).get(method, from, to).s;
    return a + b;
  };

  const sales = db.prepare(
    `SELECT COALESCE(SUM(sp.amount), 0) AS s
       FROM sale_payments sp WHERE sp.paid_at BETWEEN ? AND ?`
  ).get(from, to).s;

  res.json({
    from, to, period, membership, sales,
    total: membership + sales,
    cash: periodByMethod('cash'),
    card: periodByMethod('card'),
  });
});

// GET /api/stats/chart?date=&period= — grafik uchun bo'laklar
r.get('/chart', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const period = ['day', 'week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'day';
  const { from } = periodRange(date, period);
  const base = new Date(from);

  const pad = (n) => String(n).padStart(2, '0');
  const buckets = [];

  const sumBetween = (a, b) => {
    const m = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE paid_at BETWEEN ? AND ?'
    ).get(a, b).s;
    const s = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM sale_payments WHERE paid_at BETWEEN ? AND ?'
    ).get(a, b).s;
    return { membership: m, sales: s, total: m + s };
  };

  const iso = (d) => d.toISOString().slice(0, 19);

  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const f = new Date(base); f.setHours(h, 0, 0, 0);
      const t = new Date(base); t.setHours(h, 59, 59, 999);
      buckets.push({ label: `${pad(h)}:00`, ...sumBetween(iso(f), iso(t)) });
    }
  } else if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      const f = new Date(base); f.setDate(base.getDate() + i); f.setHours(0, 0, 0, 0);
      const t = new Date(f); t.setHours(23, 59, 59, 999);
      buckets.push({ label: `${pad(f.getDate())}-${pad(f.getMonth() + 1)}`, ...sumBetween(iso(f), iso(t)) });
    }
  } else if (period === 'month') {
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const f = new Date(base.getFullYear(), base.getMonth(), d, 0, 0, 0);
      const t = new Date(base.getFullYear(), base.getMonth(), d, 23, 59, 59);
      buckets.push({ label: String(d), ...sumBetween(iso(f), iso(t)) });
    }
  } else {
    for (let mo = 0; mo < 12; mo++) {
      const f = new Date(base.getFullYear(), mo, 1, 0, 0, 0);
      const t = new Date(base.getFullYear(), mo + 1, 0, 23, 59, 59);
      buckets.push({ label: String(mo + 1), ...sumBetween(iso(f), iso(t)) });
    }
  }

  res.json(buckets);
});

// GET /api/stats/sold-today — bugun qaysi mahsulotdan nechta sotilgan
r.get('/sold-today', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json(db.prepare(
    `SELECT si.product_name AS name, SUM(si.qty) AS qty, SUM(si.total) AS total
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
      WHERE s.sold_at = ?
      GROUP BY si.product_name
      ORDER BY qty DESC`
  ).all(today));
});

export default r;
