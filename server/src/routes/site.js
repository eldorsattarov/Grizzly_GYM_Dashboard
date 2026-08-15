import { Router } from 'express';
import { getSetting, setSetting } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const r = Router();

const KEY = 'site_config';

// Landing sahifasining boshlang'ich qiymatlari.
// Boshqaruv panelidan o'zgartirilmagan maydonlar shu yerdan olinadi.
const DEFAULTS = {
  brandName: 'GRIZZLY GYM',
  tagline: "Bulung'ur, Mingchinor",

  phone: '+998 90 123 45 67',
  telegram: 'https://t.me/grizzly_gym',
  instagram: 'https://instagram.com/grizzly_gym_1',
  instagramLabel: '@grizzly_gym_1',
  address: "Mingchinor MFY, Bulung'ur tumani, Samarqand viloyati",
  mapLink: 'https://maps.google.com/?q=Bulungur+Mingchinor',

  hours: [
    { day: 'Dushanba — Juma', time: '06:00 — 22:00' },
    { day: 'Shanba',          time: '07:00 — 21:00' },
    { day: 'Yakshanba',       time: '08:00 — 18:00' },
  ],

  // Rasmlar: base64 yoki tashqi havola. Bo'sh bo'lsa o'rin egallovchi chiqadi.
  gallery: [
    { caption: 'Asosiy zal',      src: '' },
    { caption: 'Shtanga burchagi', src: '' },
    { caption: 'Kardio',           src: '' },
    { caption: 'Gantellar',        src: '' },
  ],

  // Landing'da ko'rsatiladigan tariflar.
  // Boshqaruv tizimidagi narxlardan alohida — sayt uchun aksiya narxi
  // qo'yish mumkin. Bo'sh qoldirilsa tizim narxlari ishlatiladi.
  useSystemPrices: true,
  priceDaily: null,
  priceAlternate: null,

  // Ko'p so'raladigan savollar
  faq: [
    {
      q: "Hech qachon zalga bormaganman. Qiyin bo\u2018ladimi?",
      a: "Birinchi kun murabbiy siz bilan yuradi: qaysi trenajyor nima uchun, qanday nafas olish, qancha takror. Birinchi hafta yengil yuklama bilan o\u2018tadi.",
    },
    {
      q: "To\u2018lovni bo\u2018lib to\u2018lasam bo\u2018ladimi?",
      a: "Ha. Oylik to\u2018lovni qismlarga bo\u2018lib to\u2018lash mumkin \u2014 qoldiq summa hisobingizda ko\u2018rinib turadi va siz zaldan foydalanaverasiz.",
    },
    {
      q: "Qanday kiyim kerak?",
      a: "Sport kiyim va toza almashtiriladigan krossovka. Suv idishini olib keling \u2014 zalda suv sotiladi ham.",
    },
    {
      q: "Sinov mashg\u2018uloti bormi?",
      a: "Bor. Telegram orqali yozing yoki qo\u2018ng\u2018iroq qiling \u2014 kelib ko\u2018rasiz, jihozlar bilan tanishasiz.",
    },
  ],
};

const read = () => {
  try {
    const raw = getSetting(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
};

// GET /api/site — ochiq: landing sahifa loginsiz o'qiydi
r.get('/', (_req, res) => {
  res.json(read());
});

// PUT /api/site — faqat zal egasi
r.put('/', requireAuth, requireRole('owner'), (req, res) => {
  const body = req.body || {};
  const current = read();

  // Faqat ma'lum maydonlarni qabul qilamiz
  const allowed = [
    'brandName', 'tagline',
    'phone', 'telegram', 'instagram', 'instagramLabel',
    'address', 'mapLink', 'hours', 'gallery', 'faq',
    'useSystemPrices', 'priceDaily', 'priceAlternate',
  ];

  const next = { ...current };
  for (const k of allowed) {
    if (body[k] !== undefined) next[k] = body[k];
  }

  // Rasm hajmini cheklaymiz — baza shishib ketmasin
  if (Array.isArray(next.gallery)) {
    next.gallery = next.gallery.slice(0, 24).map((g) => ({
      caption: String(g?.caption || '').slice(0, 60),
      src: typeof g?.src === 'string' && g.src.length < 700000 ? g.src : '',
    }));
  }

  if (Array.isArray(next.faq)) {
    next.faq = next.faq.slice(0, 12).map((f) => ({
      q: String(f?.q || '').slice(0, 200),
      a: String(f?.a || '').slice(0, 900),
    })).filter((f) => f.q);
  }

  if (Array.isArray(next.hours)) {
    next.hours = next.hours.slice(0, 7).map((h) => ({
      day: String(h?.day || '').slice(0, 40),
      time: String(h?.time || '').slice(0, 40),
    }));
  }

  setSetting(KEY, JSON.stringify(next));
  res.json(next);
});

export default r;
