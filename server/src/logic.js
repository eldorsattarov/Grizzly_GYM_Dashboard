import { db } from './db.js';

/*
  KUMULYATIV HISOB MANTIQI
  ------------------------------------------------------------------
  Hisoblangan = o'tgan oylik davrlar soni × oylik narx
  To'langan   = barcha to'lovlar yig'indisi
  Qarz        = Hisoblangan − To'langan   (musbat bo'lsa)

  Qarz oydan oyga o'z-o'zidan o'tadi, chunki har oy boshlanganda
  "Hisoblangan" oshadi, "To'langan" esa o'zgarmaydi.
*/

// A'zolik boshlanganidan beri nechta oylik davr hisoblangan
export function monthsElapsed(startDate, now = new Date()) {
  const s = new Date(startDate);
  if (isNaN(s)) return 1;
  let n = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() >= s.getDate()) n += 1;
  return Math.max(1, n);
}

// Sanaga n oy qo'shish (oy oxiri holatini hisobga oladi)
export function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

const totalPaidStmt = db.prepare(
  'SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE member_id = ?'
);

const paymentsStmt = db.prepare(
  'SELECT id, amount, paid_at AS at, method FROM payments WHERE member_id = ? ORDER BY paid_at DESC'
);

// A'zoni to'liq hisob-kitobi bilan qaytarish
export function enrichMember(m, withPayments = false) {
  const totalPaid = totalPaidStmt.get(m.id).s;
  const months = monthsElapsed(m.start_date);
  const totalDue = months * m.amount;
  const balance = totalDue - totalPaid;
  const debt = Math.max(0, balance);

  let status;
  if (debt <= 0) status = 'active';
  else if (debt > m.amount) status = 'overdue';
  else status = 'partial';

  const covered = m.amount > 0 ? Math.floor(totalPaid / m.amount) : 0;

  return {
    id: m.id,
    name: m.name,
    phone: m.phone || '',
    photo: m.photo || '',
    type: m.type,
    amount: m.amount,
    startDate: m.start_date,
    monthsElapsed: months,
    totalDue,
    totalPaid,
    balance,
    debt,
    debtMonths: m.amount > 0 ? Math.ceil(debt / m.amount) : 0,
    paidUntil: addMonths(m.start_date, covered).toISOString().slice(0, 10),
    status,
    ...(withPayments ? { payments: paymentsStmt.all(m.id) } : {}),
  };
}

const salePaysStmt = db.prepare(
  `SELECT id, amount, paid_at AS paidAt, method
     FROM sale_payments WHERE sale_id = ? ORDER BY paid_at DESC`
);

const itemsStmt = db.prepare(
  `SELECT product_id AS productId, product_name AS productName, qty,
          unit_price AS unitPrice, total
     FROM sale_items WHERE sale_id = ?`
);

// Sotuvni tarkibi bilan qaytarish
export function enrichSale(s) {
  return {
    id: s.id,
    memberId: s.member_id,
    buyer: s.buyer_name,
    total: s.total,
    paid: s.paid,
    debt: Math.max(0, s.total - s.paid),
    date: s.sold_at,
    method: s.method || 'cash',
    items: itemsStmt.all(s.id),
    payments: salePaysStmt.all(s.id),
  };
}

// Sana oralig'ini davr bo'yicha hisoblash
export function periodRange(dateStr, period) {
  const base = new Date(dateStr);
  const from = new Date(base);
  const to = new Date(base);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (period === 'week') {
    const dow = (from.getDay() + 6) % 7; // dushanba = 0
    from.setDate(from.getDate() - dow);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    from.setDate(1);
    to.setMonth(from.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    from.setMonth(0, 1);
    to.setMonth(11, 31);
    to.setHours(23, 59, 59, 999);
  }

  const iso = (d) => d.toISOString().slice(0, 19);
  return { from: iso(from), to: iso(to) };
}

// ---------------------------------------------------------------
// TO'LOV USULI
// Faqat ma'lumot uchun — hisob-kitobga ta'sir qilmaydi.
// ---------------------------------------------------------------
export const PAY_METHODS = ['cash', 'card'];

export const normMethod = (v) =>
  PAY_METHODS.includes(v) ? v : 'cash';
