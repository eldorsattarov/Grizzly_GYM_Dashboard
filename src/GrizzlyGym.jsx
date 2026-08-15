import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X, LogOut, Plus, Trash2, Edit2, Search,
  Users, BarChart3, Settings, CheckCircle, AlertTriangle,
  Home, Monitor, Sun, Moon, Check, ChevronDown, ChevronUp, Globe,
  DollarSign, Weight, Lock, ShieldCheck, Timer, LogIn, Lightbulb,
  TrendingUp, XCircle, CalendarDays, CalendarClock, Wallet,
  UserRound, MapPin, LineChart, LayoutDashboard, UserPlus,
  HeartPulse, Flame, Trophy, Bike, Droplets, Footprints, Zap,
  PanelLeftClose, PanelLeftOpen, Pencil, Send, Menu,
  ShoppingCart, Package, Receipt, ImagePlus, FileSpreadsheet, Minus,
  Banknote, CreditCard, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

// ============================================
// KICHIK YORDAMCHI KOMPONENTLAR
// ============================================
function Avatar({ darkMode, src, size = 36, onOpen }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(src); } : undefined}
        className={`rounded-full object-cover flex-shrink-0 ${onOpen ? 'avatar-zoom' : ''}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${
        darkMode ? 'bg-yellow-400/10 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
      }`}
      style={{ width: size, height: size }}
    >
      <UserRound size={Math.round(size / 2)} />
    </span>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    active:  { Icon: CheckCircle,    cls: 'bg-green-500 text-white',  label: t.statusActive },
    partial: { Icon: AlertTriangle,  cls: 'bg-amber-500 text-black',  label: t.statusPartial },
    overdue: { Icon: XCircle,        cls: 'bg-red-500 text-white',    label: t.statusOverdue },
  };
  const { Icon, cls, label } = map[status] || map.overdue;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cls}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

// To'lov jarayoni chizig'i
function PayBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const full = pct >= 100;
  return (
    <div className="paybar" title={`${pct}%`}>
      <div
        className={`paybar-fill ${full ? 'is-full' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}



// ============================================
// API QATLAMI — server bilan aloqa
// ============================================
// Server manzili. Vite loyihasida index.html ichida yoki main.jsx da
// window.__GRIZZLY_API__ = 'https://...' deb o'zgartirish mumkin.
const API_BASE =
  (typeof window !== 'undefined' && window.__GRIZZLY_API__) ||
  'http://localhost:4000/api';

const TOKEN_KEY = 'grizzly_token';

// Token xotirada saqlanadi; brauzer ruxsat bersa localStorage'ga ham yoziladi
let memoryToken = '';

const readToken = () => {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    memoryToken = '';
  }
  return memoryToken;
};

const writeToken = (v) => {
  memoryToken = v || '';
  try {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage yopiq bo'lsa faqat xotirada qoladi */
  }
};

// 401 kelganda chaqiriladi — App uni o'rnatadi
let onAuthLost = () => {};

async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('NETWORK');
  }

  if (res.status === 401) {
    writeToken('');
    onAuthLost();
    throw new Error('UNAUTHORIZED');
  }
  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

const qs = (p) => {
  const clean = Object.entries(p || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
};

const api = {
  login: (login, password) => apiFetch('/auth/login', { method: 'POST', body: { login, password } }),
  me: () => apiFetch('/auth/me'),
  updateMe: (d) => apiFetch('/auth/me', { method: 'PUT', body: d }),

  members: {
    list: (p) => apiFetch(`/members${qs(p)}`),
    get: (id) => apiFetch(`/members/${id}`),
    create: (d) => apiFetch('/members', { method: 'POST', body: d }),
    update: (id, d) => apiFetch(`/members/${id}`, { method: 'PUT', body: d }),
    remove: (id) => apiFetch(`/members/${id}`, { method: 'DELETE' }),
  },
  payments: {
    create: (d) => apiFetch('/payments', { method: 'POST', body: d }),
  },
  products: {
    list: () => apiFetch('/products'),
    create: (d) => apiFetch('/products', { method: 'POST', body: d }),
    update: (id, d) => apiFetch(`/products/${id}`, { method: 'PUT', body: d }),
    remove: (id) => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  },
  sales: {
    list: (p) => apiFetch(`/sales${qs(p)}`),
    create: (d) => apiFetch('/sales', { method: 'POST', body: d }),
    pay: (id, amount, payMethod = 'cash') =>
      apiFetch(`/sales/${id}/pay`, { method: 'POST', body: { amount, method: payMethod } }),
    remove: (id) => apiFetch(`/sales/${id}`, { method: 'DELETE' }),
  },
  debtors: {
    list: (p) => apiFetch(`/debtors${qs(p)}`),
    unpaidSales: (id) => apiFetch(`/debtors/${id}/sales`),
  },
  admins: {
    list: () => apiFetch('/admins'),
    create: (d) => apiFetch('/admins', { method: 'POST', body: d }),
    update: (id, d) => apiFetch(`/admins/${id}`, { method: 'PUT', body: d }),
    remove: (id) => apiFetch(`/admins/${id}`, { method: 'DELETE' }),
  },
  settings: {
    getPrices: () => apiFetch('/settings/prices'),
    setPrices: (d) => apiFetch('/settings/prices', { method: 'PUT', body: d }),
  },
  site: {
    get: () => apiFetch('/site'),
    save: (d) => apiFetch('/site', { method: 'PUT', body: d }),
  },
  stats: {
    overview: () => apiFetch('/stats/overview'),
    chart: (period, date) => apiFetch(`/stats/chart${qs({ period, date })}`),
    period: (period, date) => apiFetch(`/stats/period${qs({ period, date })}`),
    soldToday: () => apiFetch('/stats/sold-today'),
  },
};

// ============================================
// LOGOTIPLAR
// ============================================
const LOGO_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAACQBAMAAAAVaP+LAAAAJ1BMVEUAAADzswrepAj+xRH7+fPTmwfjpgSfcAP/+wCzkwYAAAAAAAAAAABjmIymAAAACnRSTlMA8qD++V8WGgEfLaJX5gAADdlJREFUeNrtmWt0FGWax39VqVujQ+rtNgnXpLpj8C7dhMi6HIYW+4wcXYdO2Ajs6kx74+DZXbdgFkFW1xp3jOCo2zhe55xdmZkdPbOzq6zjbXeCNOeMCA5qGEeJgqRpQAJIUkEgnaRTtR86gYiJO3H2w37I/0v32/XWv556bu/zPA1jGMMYxjCGMfx/x9ozX421X5/GSKE5rHVY66A5rPsjJFqF5sAyaHJI4XxdgagXwTQBm4CNGhY1xldslr6Kaf2Gri75XBfTRRLj3eCx+IYR95YMXQRW1LQMXW69/K2C1i0MVxi9FXNfX3xkU/+Qy09W3vgnmeE4tbNUYEhXkEAdIE0qCULJ1NAXB1LDSLT0WufJcf5nZ3beWL3Hzc3bo8yL5OZFJjXHC9a1L84/I8I9wUvn7mi99Z2zdeQ46rmy5e3Kn96Z2tIWy3XFB5eFrrbjFYfOCHTfwxZ7S7ODa3nQY9Y1VkrBacfnn3k/y5XaFpinl1vyXQunaKeX3t9Hbqki2Jga0MjAq92TnprX5r7x0U2vzWke3JoJ5Oc//6en76zcIe2e8FlhcPnEt5q3viWd8g8f2FYYYh89HGtcpSQkte7MMx0hJ5VEXETNOAglgfTEkKup6hSJuL6yOmgPsYAjxypASZgBYaA/VXThVPUzFgghhCSEEGDLFQP77wI9iJSIg1R7wRBLrwsJKxFX4snUQpYOmjZ9q5UucgghhAiVsdxKARpgLJXrkqoSVxKyiKXSg8o2VkeWZsnEM9aGSuvHgcZVeQOc9qqTtmUSAZAtvD7tp98KGLAmsKpx2Y/9XLyvQAHvVGSjOyiQ/SMLEkgxdMm8PVQrgvZaIBAjJkREhEJChIUw1RmAsVYNidrgEumCFJJJgrh8pTNotflvzzIO7El+NLETz8iXvl8RePc/0R/RThzphlm78hM7Phd5uKL1+umJ3zTXt4lLsn352T9HkN/L+QfKXigUiYzm9t9U7jWtw+KwzLSTt73aeaJ6HOr+rj2nAiAl3u0oSJYLEy5pO5YJTNr13dc+pNG9dJuzXcrH2nOz8wvnZ1CA1V2Z9ykpKQdQLnz+7yS/73gn4nj0sv3vIuc+Nbw1P5NlT6JaprOzq+px2et+9Im/gmCHinmCfc8fHnCJhRbREnG7KLpJtdVwUcAuBlBYTEtK9l0y3CxEcbduy9b6IEC6WqgxswS5TgMFsNZ3SkAxGmTTy1q7+H0CaCZruhtLNtjhT8jIpdU7EkAhTfZv63x/0FTWMXePPGB+iYZPPSSQUUOWXO+iUGhublYkqEKOZ6enAy4l0NzcnFHi1EZyXJWiBciCHjcHIl2to6R8vXhS1OmoUVFyQ3gwVOukWPnAVxFKmgOZQKqRKmbUK3FHCDVmVpvxsA0yOFPA64Wd9PckZh805XH7Bh2sX6FAIBV4Kq3iXcRgMtqtNOzaCQ7h/iyQkX+uAWgzUiwsk0RSBAc21hclcog9KURZIwQsEQqq0YHLsYFPXcyQY2a1aarCQEbz1Q3hF6yB9Kk31EAGHMCB3qVYmzTtzpN4HfcOZGQZEz1SAzIl5EwXtc9cRgklTD4/Mn9z3nADxomCr4/TJFnyi1mph3+eeMQrH7+1Ss77zRPbAVRJ6zG6pe5r9vXrn5/U28f5al3Y3CYDhcwLXfiCWDSPn90jZL+jaAbdbVm6D9qqOn3/xGK7DYD8mgOyNN2j5Sbfw+56yjPdTCaNjKx8ApfPDZS4r5hpQ7KE5f9DsvgWV9Kz4QdmJxnfPPQQLw0Yzem7n5OmF41ijnO9ttJoD5JRzISNaZbfrZmrpORalgBFtyYRR2isHNBsIGYnTp8EqIvQ5GSyATWZfqCxTkOG7Ly921LrD/Vq6ySy8lsrygPFvUqhy05NWpqWQMJenm9/7DOleOUp6q//tXWLb1olOmb2nr377qcEWlvrmr/95g47uEc6NSW+3eyf+Vw/wLzNvW1vyNvvdXsf3npO1YnIX1645eNvZgFeWbR5L/lE5Nltl/7Oiwdmvv+9E0UXk68E0rfr+gXUB0PmxOJz40JUYN8lx2I3x0QaqBYDvu1EqoOiggatCYDqlFGMNe22/BKwJ9+xxOd3PnK3AyQSQB/ph5TsqWctydCNFR1ISiIBONM9Hw+l5Ps2cPv45/JFot5Jx/do4KTNNr0DfDOLkgBc/DLN6G36KP76t+2e/E9kfCABWMBUTe7uSYPzwsHeM+ea0IpH0ANCCBNIJBJKQlKFSKZXS7W1MZapsgiuUBJxJREHSQghijbR9eCQAsypTg8EdpFIScRFiHhFqrrM0rRIwzSd+lA4acURQklQPO0WATjG0DOVZ9Zb+mpHg5vDRaK4EEKYMV2NiZQN2LeIGapcK4QQIhGHmAgJE2x0e7k5pBoxeqdnfduBMC6+S2KTCSB/I/WT40qnkws747zSeFfRxn40QyyLpBwB1jvyHHPD6SKicF8PJ19dWd4qj+uGvGKVugB+/6snT9UcnPNw8990zrU2DKR4puy197ko/d1q4we7K0q2tgypRjKtV+4NtOwrXHwQyMuWVrypsrPXn9290Sg51L+pZWVHkX0mlfmdEPFOTTnZU3Fw/xcrtmW/bGw1Jxz0C0Be6mgPu0DVebuDDz7uz59Z2XpArXrlwoALsKuztTUApRdf/GHM7c+ta/4C0Y6bNuRPTD449TwXKZ/MSq6ZR26LRMr+7YHI73+tTf/knEsj3rYAmD0GE9wAiPp/D7zlHnPuOav0MxxnyYufN+zJwqleE7m8nc/jQOGDo/W89+m4mQCFncr4DuRv7B8PuKVXl1zc/vQXSz/Ir86bpvcfxQoWvGPzKAAoHdbLB7LXnSjyyMEOBo9Ayap8O/s0ZxOBczw65McpLyB2AMw53jdZ3RwHyODttk4TQdq1GIYo6yKRBdl8F2hTLHkmgNKZfP3GEwBczfk+4LmXF5UiDemehhDRYkU9wFvlAsqKrOcCFOS3Vr9UACi8S+7xHHDRRgsscgTywxJ5aT8JhG0TrNmBebQBKF7lA54CsAX5yt9+V7asY2oW8C2mMiwRZAG5wz4A+VebXrS8HQDz9tzrx4GCSeXrzz26IHvi49447LWzQ+/+ApFqtgTxsz/syy/Y9ZD8QA4pA/RLxTSxBdrzvU3/0rlbVl9GNo+H2DtsdxTdv/CyVjszd88c7XALrxc2LXNdbRJsMZa1fGxR6ILroi2bQDv3CrWxc/6RqR8oFIbpjlILk5IZCImYEBYpA/RqIUwlcVVwhZlIIESoXMNgEWEhYqLMCNuS6QwnUbLX/1D/8yXZLPROOGw3o7gakq79Vt+if9gmgBtrWpTbt0h5cKV7Z27JrG8xW4YhyrQc6Llo868CveFOJlytZGjabeShSw+3X9hjAML8Vwp/FnZdIqX5l7do+XMqjOGIDM/Ml89s7blmb17ufrMZmpOuC3ByzavFkqJ2B2zfnvclLtteWCAdyi82MsP0tJofS/7QqtoIQvqOZQOEg4BXFd2ZA7yqjY4D6dyzvot+bS53VHTnh2tFA1rQUEWs5pk7ArYxWC1FIpFFDHwGBmoojXUNIlaW1oam/S9A2AQaG4vxaAfUZLrYQKllA1GdvmGwYZdrFoFUPkK7nvp86yFY2ilblY/Mel73gnc0pazc0/okt/wjI+WVPOuZRwj0VCf0l2p/CYFJ/SO172ptjQ3UCnEDoAU1MFhJ3ES1gbskMwVaWJgAK8MzjBEHCI993ztvN2gP2XoPqRl75UOzco/FC9nzeePOmk3jf/ooLb+4ZmPaBvVc2f/mxpGmCRpPhENiEQTq60jewipZLDITxG2UuFldpvMYlhqbBnpDSNTY2sgzjKdBDceECMXKqJAsgkKtFUIsFyJUtz5oUgb3x2qFCMXKbIzUV0xDAg40CBFMClTVJDRDioVqZ8ixWlEn1VqBchXJbAiL4CJY+r8MWZo+3gAQXrDzzXDDg+LkOVJotlXevFmd887hv95d/citm7IAD/acNQBRziZaYyyd5DTljmY3W9kJVkOlzW37nMbKTt7LVR3daJGJT+t1msbZf+joSKoAQ40l7ZUo8+REXLWprjNkAsERhkjK8D/7yuTDV003f9T+X3qCgocy+3nVPLr4Z/Rc1jK6aVZagGWvL5djQkiSJESdHNTTJpI1gq3kEYhWJ6N8GnlvXEkOYkoU+cCdHdetdIkutkYnkabG0rJcptMgxAUPNohgCrUOFpaPelKXqjdlRNIeUmeaaCKVGvXITzaheuKKCKgqyJYqTBgxA42oI7z7YLl37j+VoszuS+CX9SdldP6wqd9Q9G8x8tup++RUQA8cLu0xTt16tC3f39fTP1oiJKPfM7J3fTRJlBzJh0sv+cX+8CHOGZFoxIGm0VN6vOTSA10soC960JVfLJSqR/TLd/aOVtmabMpUx0ihF1uE5SJpq1cERq1s/vECn1wuKcz+uJNA2DllY7a/ZPSzWq1Q9tn10fff2Rf1WyDGe2IBmYPR+jWj9qObLemiJnWiHBNCEmJGoFzTTIQxavPf86u5H7j//Z2pf/Gaby12j5+8W9zUfIrJ10VHGf3oglkQwFkhatRwxC4q9HuWM2qj1WGefZMelUc02wiJjTVdzxLPAjTJnnO/1+sAd29QCv5og39hUvpSXk4lEfYolR19e9b2lrMLxJbZpZf4o9S2LpC/lDIciVutUSYk/QZH/7LPqKjpr/ufxh+NO4Y90dHG/gYbwxjGMIYxjGEM/6f4H7XBvSvK6PHzAAAAAElFTkSuQmCC';

// Ayiq logotipi — animatsiya uchun
function BearLogo({ size = 64, className = '', style }) {
  return (
    <img
      src={LOGO_ICON}
      alt="Grizzly GYM"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      draggable={false}
    />
  );
}

// ============================================
// TARJIMALAR / ПЕРЕВОДЫ / TRANSLATIONS
// ============================================
const translations = {
  uz: {
    // Login
    brandTagline: "Foydalanuvchilar va to'lov boshqaruvining eng yangi tizimi",
    loginTitle: 'Tizimga kirish',
    loginSubtitle: "Davom etish uchun ma'lumotlarni kiriting",
    login: 'Login',
    password: 'Parol',
    signIn: 'KIRISH',
    demoMode: 'Sinov loginlari',
    demoHint: 'admin / admin123  ·  kassir / kassir123',
    tlsNote: 'Ulanish TLS 1.3 bilan himoyalangan',
    fillFields: "Login va parolni to'ldiring!",
    featSecure: 'Xavfsiz kirish',
    featSecureDesc: "Barcha ma'lumotlar shifrlangan",
    featStats: 'Real-vaqt statistika',
    featStatsDesc: "Daromad va a'zolarni kuzatish",
    featAuto: 'Avtomatik tekshirish',
    featAutoDesc: 'Muddatni doimiy kuzatish',
    featMembers: "A'zo boshqaruvi",
    featMembersDesc: "To'liq ma'lumotlarni saqlash",

    // Navigation
    navDashboard: 'Boshqaruv',
    navMembers: "A'zolar",
    navAnalytics: 'Analitika',
    navRecords: 'Kirishlar',
    navSales: 'Sotuv',
    navDebtors: 'Qarzdorlar',
    pageDebtors: 'Qarzdorlar',
    membershipDebt: "Oylik to'lovdan",
    saleDebtCol: 'Sotuvdan',
    totalDebtCol: 'Jami qarz',
    debtorAccount: 'Qarzdor hisobi',
    noDebtors: "Qarzdorlar yo'q",
    unpaidSales: "To'lanmagan sotuvlar",
    settleAll: "To'liq yopish",
    searchDebtor: 'Qarzdor qidirish...',
    admins: 'Adminlar',
    addAdmin: "Admin qo'shish",
    editAdmin: 'Adminni tahrirlash',
    role: 'Rol',
    roleOwner: 'Egasi',
    roleAdmin: 'Administrator',
    roleCashier: 'Kassir',
    adminAdded: "Admin qo'shildi!",
    loginRequired: 'Login kiriting!',
    passwordRequired: 'Parol kiriting!',
    payMethod: "To'lov usuli",
    cash: 'Naqd',
    card: 'Karta',
    cashIncome: 'Naqd pul',
    cardIncome: 'Karta orqali',
    navSite: 'Sayt sozlamalari',
    pageSite: 'Sayt sozlamalari',
    siteHint: "Bu yerdagi o'zgarishlar landing sahifada darhol ko'rinadi",
    siteContacts: 'Aloqa va havolalar',
    siteHours: 'Ish vaqti',
    siteGallery: 'Zal rasmlari',
    sitePrices: 'Saytdagi narxlar',
    useSystemPrices: 'Tizim narxlaridan olish',
    customPrices: 'Alohida narx qo\'yish',
    telegramLink: 'Telegram havolasi',
    instagramLink: 'Instagram havolasi',
    instagramName: 'Instagram nomi',
    mapLinkLabel: 'Xarita havolasi',
    addressLabel: 'Manzil',
    dayLabel: 'Kun',
    timeLabel: 'Vaqt',
    addRow: "Qator qo'shish",
    caption: 'Izoh',
    pickImage: 'Rasm tanlash',
    removeImage: "Rasmni o'chirish",
    imageHint: 'Kvadrat, 1 Mb gacha · 24 tagacha rasm',
    addImage: "Rasm qo'shish",
    replaceImage: 'Almashtirish',
    removeSlot: "Katakni o'chirish",
    myProfile: 'Mening hisobim',
    roleLabels: { owner: 'Egasi', admin: 'Administrator', cashier: 'Kassir' },
    changePassword: "Parolni o'zgartirish",
    currentPassword: 'Joriy parol',
    newPassword: 'Yangi parol',
    passwordOptional: "Parolni o'zgartirmasangiz bo'sh qoldiring",
    profileSaved: 'Ma\'lumotlar yangilandi!',
    brandName: 'Zal nomi',
    taglineLabel: 'Joylashuv (sarlavha ostida)',
    siteFaq: 'Savol-javob',
    question: 'Savol',
    answer: 'Javob',
    addFaq: "Savol qo'shish",
    installApp: "Dastur sifatida o'rnatish",
    installHint: "Telefon ekraniga ikonka qo'shiladi",
    installIos: "Safari'da: Ulashish → Bosh ekranga qo'shish",
    saveSite: "Saytni yangilash",
    siteSaved: 'Sayt yangilandi!',
    openSite: 'Saytni ochish',
    wrongCredentials: "Login yoki parol noto'g'ri",
    serverDown: 'Serverga ulanib bo\'lmadi',
    loadError: "Ma'lumot yuklanmadi",
    loadingText: 'Yuklanmoqda...',
    retry: 'Qayta urinish',
    offlineMode: 'Demo rejim',
    offlineHint: "Server ulanmagan — ma'lumotlar saqlanmaydi",
    editPrices: 'Narxlarni tahrirlash',
    priceDaily: 'Har kuni (oylik)',
    priceAlternate: 'Kun ora (oylik)',
    priceNote: "Yangi narx faqat yangi a'zolarga qo'llanadi",
    fullName: "To'liq ism",
    navSettings: 'Sozlamalar',
    logout: 'Chiqish',
    administrator: 'Administrator',
    profileEdit: "Ma'lumotlarni tahrirlash",
    collapse: "Yig'ish",
    expand: 'Yoyish',
    developer: 'Dasturchi',

    // Page titles
    pageDashboard: 'Boshqaruv paneli',
    pageMembers: "A'zolar",
    pageAnalytics: 'Analitika',
    pageRecords: 'Kirishlar jurnali',
    pageSales: 'Sotuv va kunlik daromad',
    pageSettings: 'Sozlamalar',
    today: 'Bugungi kun',

    // Stats
    totalMembers: "Jami a'zolar",
    activeMembers: "Faol a'zolar",
    overdueMembers: "Muddati o'tgan",
    monthlyRevenue: "Jami yig'ilgan",
    membershipIncome: "A'zolikdan",
    salesIncome: 'Sotuvdan',
    todayIncome: 'Bugungi daromad',
    products: 'Mahsulotlar',
    addProduct: "Mahsulot qo'shish",
    productName: 'Mahsulot nomi',
    price: 'Narx',
    addSale: "Sotuv qo'shish",
    newSale: 'Yangi sotuv',
    product: 'Mahsulot',
    qty: 'Soni',
    buyer: 'Xaridor',
    guest: "Kunlik a'zo",
    salesHistory: 'Sotuvlar tarixi',
    noSales: "Bugun hali sotuv qayd qilinmagan",
    saleAdded: "Sotuv qayd qilindi!",
    productAdded: "Mahsulot qo'shildi!",
    sold: 'Sotildi',
    soldToday: 'Bugun sotilgan mahsulotlar',
    paidNow: "To'landi",
    onCredit: 'Qarzga',
    salesDebt: 'Sotuv qarzi',
    payDebt: "Qarzni to'lash",
    settleSale: "Sotuv qarzini to'lash",
    fullyPaidShort: "To'liq",
    cart: 'Savat',
    addToCart: "Savatga qo'shish",
    emptyCart: "Savat bo'sh",
    items: 'ta mahsulot',
    searchProduct: 'Mahsulot qidirish...',
    searchBuyer: 'Xaridor qidirish...',
    more: 'yana',
    pcs: 'dona',
    thisWeek: 'shu hafta',
    actionNeeded: 'Harakat kerak',

    // Chart
    weeklyActivity: 'Haftalik faoliyat',
    active: 'Faol',
    inactive: 'Nofaol',

    // Table
    recentMembers: "Eng so'nggi a'zolar",
    name: 'Ism',
    phone: 'Telefon',
    type: "To'lov turi",
    photo: 'Rasm',
    optional: 'ixtiyoriy',
    uploadPhoto: 'Rasm yuklash',
    removePhoto: "Rasmni o'chirish",
    photoHint: "Maksimal 1 Mb, 500x500 o'lchamda",
    amount: 'Summa',
    lastPayment: "Oxirgi to'lov sanasi",
    paymentTime: "To'lov vaqti",
    now: 'Hozir',
    day: 'Kun',
    week: 'Hafta',
    month: 'Oy',
    year: 'Yil',
    period: 'Davr',
    periodIncome: 'Davr daromadi',
    incomeBy: {
      day: 'Kunlik daromad',
      week: 'Haftalik daromad',
      month: 'Oylik daromad',
      year: 'Yillik daromad',
    },
    paid: "To'langan",
    debt: 'Qarz',
    remaining: 'Qoldiq summa',
    statusPartial: 'Qarzdor',
    addPayment: "To'lov qabul qilish",
    paymentAmount: "To'lov summasi",
    fullAmount: "To'liq summa",
    payFull: "To'liq to'lash",
    totalDebt: 'Umumiy qarz',
    paymentHistory: "To'lovlar tarixi",
    noPayments: "To'lov qayd qilinmagan",
    member: "A'zo",
    paymentAdded: "To'lov qabul qilindi!",
    amountRequired: "To'lov summasini kiriting!",
    initialPayment: "Boshlang'ich to'lov",
    debtors: 'Qarzdorlar',
    totalDue: "Jami hisoblangan",
    validUntil: 'Amal qiladi',
    months: 'oy',
    monthsDue: 'Hisoblangan oylar',
    debtMonths: 'oylik qarz',
    startDate: "A'zolik boshlangan",
    ledger: 'Hisob-kitob',
    prepaid: 'Oldindan',
    editMember: "A'zoni tahrirlash",
    editProduct: 'Mahsulotni tahrirlash',
    confirmTitle: "Rostdan ham o'chirmoqchimisiz?",
    confirmText: "Bu amalni ortga qaytarib bo'lmaydi.",
    yes: 'Ha',
    no: "Yo'q",
    updated: 'Yangilandi!',
    deleted: "O'chirildi!",
    exportExcel: 'Excelga yuklash',
    exported: 'Fayl yuklandi!',
    downloadBlocked: "Brauzer yuklab olishni blokladi. Dasturni o'z proyektingizda ishga tushiring.",
    exportError: 'Eksport xatosi',
    total: 'Jami',
    no_: '№',
    page: 'Sahifa',
    perPage: 'Sahifada',
    of: 'dan',
    prev: 'Oldingi',
    next: 'Keyingi',
    status: 'Holati',
    actions: 'Amallar',
    daily: 'Har kuni',
    alternate: 'Kun ora',
    tariff: 'tarif',
    statusActive: 'Faol',
    statusOverdue: "O'tgan",

    // Actions
    addMember: "A'zo qo'shish",
    searchPlaceholder: 'Qidirish...',
    all: 'Barchasi',
    export: 'Yuklab olish',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    nameRequired: 'Ism majburiy!',
    memberAdded: "A'zo qo'shildi!",
    confirmDelete: "A'zoni o'chirasizmi?",
    newMember: "Yangi a'zo",

    // Records
    entryTime: 'Kirish vaqti',
    exitTime: 'Chiqish vaqti',
    duration: 'Davomiyligi',
    hours: 'soat',
    minutes: 'daqiqa',

    // Settings
    settingsPricing: 'Narxlar',
    pricingDaily: 'Har kuni keluvchilar uchun',
    pricingAlternate: 'Kun ora keluvchilar uchun',
    perMonth: 'oyiga',

    // Theme
    themeLight: "Yorug'",
    themeDark: "Qorong'i",
    themeSystem: "Tizim bo'yicha",

    comingSoon: 'moduli ishlab chiqilmoqda...',
  },

  ru: {
    // Login
    brandTagline: 'Новейшая система управления клиентами и платежами',
    loginTitle: 'Вход в систему',
    loginSubtitle: 'Введите данные для продолжения',
    login: 'Логин',
    password: 'Пароль',
    signIn: 'ВОЙТИ',
    demoMode: 'Тестовые логины',
    demoHint: 'admin / admin123  ·  kassir / kassir123',
    tlsNote: 'Соединение защищено TLS 1.3',
    fillFields: 'Заполните логин и пароль!',
    featSecure: 'Безопасный вход',
    featSecureDesc: 'Все данные зашифрованы',
    featStats: 'Статистика в реальном времени',
    featStatsDesc: 'Отслеживание доходов и участников',
    featAuto: 'Автоматическая проверка',
    featAutoDesc: 'Постоянный контроль сроков',
    featMembers: 'Управление участниками',
    featMembersDesc: 'Хранение полной информации',

    // Navigation
    navDashboard: 'Панель',
    navMembers: 'Участники',
    navAnalytics: 'Аналитика',
    navRecords: 'Посещения',
    navSales: 'Продажи',
    navDebtors: 'Должники',
    pageDebtors: 'Должники',
    membershipDebt: 'По абонементу',
    saleDebtCol: 'По продажам',
    totalDebtCol: 'Общий долг',
    debtorAccount: 'Счёт должника',
    noDebtors: 'Должников нет',
    unpaidSales: 'Неоплаченные продажи',
    settleAll: 'Погасить полностью',
    searchDebtor: 'Поиск должника...',
    admins: 'Администраторы',
    addAdmin: 'Добавить админа',
    editAdmin: 'Редактировать админа',
    role: 'Роль',
    roleOwner: 'Владелец',
    roleAdmin: 'Администратор',
    roleCashier: 'Кассир',
    adminAdded: 'Админ добавлен!',
    loginRequired: 'Введите логин!',
    passwordRequired: 'Введите пароль!',
    payMethod: 'Способ оплаты',
    cash: 'Наличные',
    card: 'Карта',
    cashIncome: 'Наличными',
    cardIncome: 'По карте',
    navSite: 'Настройки сайта',
    pageSite: 'Настройки сайта',
    siteHint: 'Изменения сразу видны на лендинге',
    siteContacts: 'Контакты и ссылки',
    siteHours: 'Часы работы',
    siteGallery: 'Фото зала',
    sitePrices: 'Цены на сайте',
    useSystemPrices: 'Брать из системы',
    customPrices: 'Указать отдельно',
    telegramLink: 'Ссылка Telegram',
    instagramLink: 'Ссылка Instagram',
    instagramName: 'Имя в Instagram',
    mapLinkLabel: 'Ссылка на карту',
    addressLabel: 'Адрес',
    dayLabel: 'День',
    timeLabel: 'Время',
    addRow: 'Добавить строку',
    caption: 'Подпись',
    pickImage: 'Выбрать фото',
    removeImage: 'Удалить фото',
    imageHint: 'Квадрат, до 1 Мб · до 24 фото',
    addImage: 'Добавить фото',
    replaceImage: 'Заменить',
    removeSlot: 'Удалить ячейку',
    myProfile: 'Мой аккаунт',
    roleLabels: { owner: 'Владелец', admin: 'Администратор', cashier: 'Кассир' },
    changePassword: 'Смена пароля',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    passwordOptional: 'Оставьте пустым, если не меняете пароль',
    profileSaved: 'Данные обновлены!',
    brandName: 'Название зала',
    taglineLabel: 'Локация (под заголовком)',
    siteFaq: 'Вопросы и ответы',
    question: 'Вопрос',
    answer: 'Ответ',
    addFaq: 'Добавить вопрос',
    installApp: 'Установить как приложение',
    installHint: 'На экране появится иконка',
    installIos: 'В Safari: Поделиться → На экран «Домой»',
    saveSite: 'Обновить сайт',
    siteSaved: 'Сайт обновлён!',
    openSite: 'Открыть сайт',
    wrongCredentials: 'Неверный логин или пароль',
    serverDown: 'Не удалось подключиться к серверу',
    loadError: 'Не удалось загрузить данные',
    loadingText: 'Загрузка...',
    retry: 'Повторить',
    offlineMode: 'Демо-режим',
    offlineHint: 'Сервер не подключён — данные не сохраняются',
    editPrices: 'Редактировать цены',
    priceDaily: 'Ежедневно (в месяц)',
    priceAlternate: 'Через день (в месяц)',
    priceNote: 'Новая цена применяется только к новым участникам',
    fullName: 'Полное имя',
    navSettings: 'Настройки',
    logout: 'Выйти',
    administrator: 'Администратор',
    profileEdit: 'Редактировать данные',
    collapse: 'Свернуть',
    expand: 'Развернуть',
    developer: 'Разработчик',

    // Page titles
    pageDashboard: 'Панель управления',
    pageMembers: 'Участники',
    pageAnalytics: 'Аналитика',
    pageRecords: 'Журнал посещений',
    pageSales: 'Продажи и дневной доход',
    pageSettings: 'Настройки',
    today: 'Сегодня',

    // Stats
    totalMembers: 'Всего участников',
    activeMembers: 'Активные',
    overdueMembers: 'Просрочено',
    monthlyRevenue: 'Всего собрано',
    membershipIncome: 'От абонементов',
    salesIncome: 'От продаж',
    todayIncome: 'Доход за сегодня',
    products: 'Товары',
    addProduct: 'Добавить товар',
    productName: 'Название товара',
    price: 'Цена',
    addSale: 'Добавить продажу',
    newSale: 'Новая продажа',
    product: 'Товар',
    qty: 'Кол-во',
    buyer: 'Покупатель',
    guest: 'Разовый клиент',
    salesHistory: 'История продаж',
    noSales: 'Сегодня продаж пока нет',
    saleAdded: 'Продажа записана!',
    productAdded: 'Товар добавлен!',
    sold: 'Продано',
    soldToday: 'Проданные сегодня товары',
    paidNow: 'Оплачено',
    onCredit: 'В долг',
    salesDebt: 'Долг по продажам',
    payDebt: 'Погасить долг',
    settleSale: 'Погашение долга по продаже',
    fullyPaidShort: 'Полностью',
    cart: 'Корзина',
    addToCart: 'Добавить в корзину',
    emptyCart: 'Корзина пуста',
    items: 'товара',
    searchProduct: 'Поиск товара...',
    searchBuyer: 'Поиск покупателя...',
    more: 'ещё',
    pcs: 'шт',
    thisWeek: 'на этой неделе',
    actionNeeded: 'Требуется действие',

    // Chart
    weeklyActivity: 'Недельная активность',
    active: 'Активные',
    inactive: 'Неактивные',

    // Table
    recentMembers: 'Последние участники',
    name: 'Имя',
    phone: 'Телефон',
    type: 'Тип оплаты',
    photo: 'Фото',
    optional: 'необязательно',
    uploadPhoto: 'Загрузить фото',
    removePhoto: 'Удалить фото',
    photoHint: 'Максимум 1 Мб, размер 500x500',
    amount: 'Сумма',
    lastPayment: 'Дата последней оплаты',
    paymentTime: 'Время оплаты',
    now: 'Сейчас',
    day: 'День',
    week: 'Неделя',
    month: 'Месяц',
    year: 'Год',
    period: 'Период',
    periodIncome: 'Доход за период',
    incomeBy: {
      day: 'Дневной доход',
      week: 'Недельный доход',
      month: 'Месячный доход',
      year: 'Годовой доход',
    },
    paid: 'Оплачено',
    debt: 'Долг',
    remaining: 'Остаток',
    statusPartial: 'Должник',
    addPayment: 'Принять оплату',
    paymentAmount: 'Сумма оплаты',
    fullAmount: 'Полная сумма',
    payFull: 'Оплатить полностью',
    totalDebt: 'Общий долг',
    paymentHistory: 'История оплат',
    noPayments: 'Оплат не зафиксировано',
    member: 'Участник',
    paymentAdded: 'Оплата принята!',
    amountRequired: 'Введите сумму оплаты!',
    initialPayment: 'Первоначальная оплата',
    debtors: 'Должники',
    totalDue: 'Всего начислено',
    validUntil: 'Действует до',
    months: 'мес',
    monthsDue: 'Начислено месяцев',
    debtMonths: 'мес долга',
    startDate: 'Начало членства',
    ledger: 'Расчёт',
    prepaid: 'Предоплата',
    editMember: 'Редактировать участника',
    editProduct: 'Редактировать товар',
    confirmTitle: 'Вы действительно хотите удалить?',
    confirmText: 'Это действие нельзя отменить.',
    yes: 'Да',
    no: 'Нет',
    updated: 'Обновлено!',
    deleted: 'Удалено!',
    exportExcel: 'Скачать в Excel',
    page: 'Страница',
    perPage: 'На странице',
    of: 'из',
    prev: 'Назад',
    next: 'Вперёд',
    exported: 'Файл загружен!',
    downloadBlocked: 'Браузер заблокировал загрузку. Запустите приложение в своём проекте.',
    exportError: 'Ошибка экспорта',
    total: 'Итого',
    no_: '№',
    status: 'Статус',
    actions: 'Действия',
    daily: 'Ежедневно',
    alternate: 'Через день',
    tariff: 'тариф',
    statusActive: 'Активен',
    statusOverdue: 'Просрочен',

    // Actions
    addMember: 'Добавить участника',
    searchPlaceholder: 'Поиск...',
    all: 'Все',
    export: 'Скачать',
    save: 'Сохранить',
    cancel: 'Отмена',
    nameRequired: 'Имя обязательно!',
    memberAdded: 'Участник добавлен!',
    confirmDelete: 'Удалить участника?',
    newMember: 'Новый участник',

    // Records
    entryTime: 'Время входа',
    exitTime: 'Время выхода',
    duration: 'Продолжительность',
    hours: 'ч',
    minutes: 'мин',

    // Settings
    settingsPricing: 'Цены',
    pricingDaily: 'Для ежедневных посещений',
    pricingAlternate: 'Для посещений через день',
    perMonth: 'в месяц',

    // Theme
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeSystem: 'Системная',

    comingSoon: 'модуль в разработке...',
  },

  en: {
    // Login
    brandTagline: 'The newest member and payment management system',
    loginTitle: 'Sign in',
    loginSubtitle: 'Enter your credentials to continue',
    login: 'Login',
    password: 'Password',
    signIn: 'SIGN IN',
    demoMode: 'Test logins',
    demoHint: 'admin / admin123  ·  kassir / kassir123',
    tlsNote: 'Connection secured with TLS 1.3',
    fillFields: 'Please fill in login and password!',
    featSecure: 'Secure access',
    featSecureDesc: 'All data is encrypted',
    featStats: 'Real-time statistics',
    featStatsDesc: 'Track revenue and members',
    featAuto: 'Automatic checks',
    featAutoDesc: 'Continuous expiry monitoring',
    featMembers: 'Member management',
    featMembersDesc: 'Store complete records',

    // Navigation
    navDashboard: 'Dashboard',
    navMembers: 'Members',
    navAnalytics: 'Analytics',
    navRecords: 'Check-ins',
    navSales: 'Sales',
    navDebtors: 'Debtors',
    pageDebtors: 'Debtors',
    membershipDebt: 'Membership',
    saleDebtCol: 'Sales',
    totalDebtCol: 'Total debt',
    debtorAccount: 'Debtor account',
    noDebtors: 'No debtors',
    unpaidSales: 'Unpaid sales',
    settleAll: 'Settle in full',
    searchDebtor: 'Search debtor...',
    admins: 'Admins',
    addAdmin: 'Add admin',
    editAdmin: 'Edit admin',
    role: 'Role',
    roleOwner: 'Owner',
    roleAdmin: 'Administrator',
    roleCashier: 'Cashier',
    adminAdded: 'Admin added!',
    loginRequired: 'Enter login!',
    passwordRequired: 'Enter password!',
    payMethod: 'Payment method',
    cash: 'Cash',
    card: 'Card',
    cashIncome: 'Cash',
    cardIncome: 'By card',
    navSite: 'Site settings',
    pageSite: 'Site settings',
    siteHint: 'Changes appear on the landing page right away',
    siteContacts: 'Contacts and links',
    siteHours: 'Opening hours',
    siteGallery: 'Gym photos',
    sitePrices: 'Prices on the site',
    useSystemPrices: 'Use system prices',
    customPrices: 'Set separately',
    telegramLink: 'Telegram link',
    instagramLink: 'Instagram link',
    instagramName: 'Instagram handle',
    mapLinkLabel: 'Map link',
    addressLabel: 'Address',
    dayLabel: 'Day',
    timeLabel: 'Time',
    addRow: 'Add row',
    caption: 'Caption',
    pickImage: 'Choose photo',
    removeImage: 'Remove photo',
    imageHint: 'Square, up to 1 MB · up to 24 photos',
    addImage: 'Add photo',
    replaceImage: 'Replace',
    removeSlot: 'Remove slot',
    myProfile: 'My account',
    roleLabels: { owner: 'Owner', admin: 'Administrator', cashier: 'Cashier' },
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    passwordOptional: 'Leave empty to keep your password',
    profileSaved: 'Profile updated!',
    brandName: 'Gym name',
    taglineLabel: 'Location (under the title)',
    siteFaq: 'Questions and answers',
    question: 'Question',
    answer: 'Answer',
    addFaq: 'Add question',
    installApp: 'Install as app',
    installHint: 'An icon will appear on your screen',
    installIos: 'In Safari: Share → Add to Home Screen',
    saveSite: 'Update site',
    siteSaved: 'Site updated!',
    openSite: 'Open site',
    wrongCredentials: 'Wrong login or password',
    serverDown: 'Cannot reach the server',
    loadError: 'Failed to load data',
    loadingText: 'Loading...',
    retry: 'Retry',
    offlineMode: 'Demo mode',
    offlineHint: 'Server not connected — data is not saved',
    editPrices: 'Edit prices',
    priceDaily: 'Daily (monthly)',
    priceAlternate: 'Every other day (monthly)',
    priceNote: 'New price applies to new members only',
    fullName: 'Full name',
    navSettings: 'Settings',
    logout: 'Log out',
    administrator: 'Administrator',
    profileEdit: 'Edit profile',
    collapse: 'Collapse',
    expand: 'Expand',
    developer: 'Developer',

    // Page titles
    pageDashboard: 'Dashboard',
    pageMembers: 'Members',
    pageAnalytics: 'Analytics',
    pageRecords: 'Check-in log',
    pageSales: 'Sales & daily income',
    pageSettings: 'Settings',
    today: 'Today',

    // Stats
    totalMembers: 'Total members',
    activeMembers: 'Active members',
    overdueMembers: 'Overdue',
    monthlyRevenue: 'Total collected',
    membershipIncome: 'Memberships',
    salesIncome: 'Sales',
    todayIncome: "Today's income",
    products: 'Products',
    addProduct: 'Add product',
    productName: 'Product name',
    price: 'Price',
    addSale: 'Record sale',
    newSale: 'New sale',
    product: 'Product',
    qty: 'Qty',
    buyer: 'Buyer',
    guest: 'Day pass',
    salesHistory: 'Sales history',
    noSales: 'No sales recorded today',
    saleAdded: 'Sale recorded!',
    productAdded: 'Product added!',
    sold: 'Sold',
    soldToday: 'Products sold today',
    paidNow: 'Paid',
    onCredit: 'On credit',
    salesDebt: 'Sales debt',
    payDebt: 'Settle debt',
    settleSale: 'Settle sale debt',
    fullyPaidShort: 'Full',
    cart: 'Cart',
    addToCart: 'Add to cart',
    emptyCart: 'Cart is empty',
    items: 'items',
    searchProduct: 'Search product...',
    searchBuyer: 'Search buyer...',
    more: 'more',
    pcs: 'pcs',
    thisWeek: 'this week',
    actionNeeded: 'Action needed',

    // Chart
    weeklyActivity: 'Weekly activity',
    active: 'Active',
    inactive: 'Inactive',

    // Table
    recentMembers: 'Recent members',
    name: 'Name',
    phone: 'Phone',
    type: 'Payment type',
    photo: 'Photo',
    optional: 'optional',
    uploadPhoto: 'Upload photo',
    removePhoto: 'Remove photo',
    photoHint: 'Max 1 Mb, 500x500 size',
    amount: 'Amount',
    lastPayment: 'Last payment date',
    paymentTime: 'Payment time',
    now: 'Now',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    period: 'Period',
    periodIncome: 'Period income',
    incomeBy: {
      day: 'Daily income',
      week: 'Weekly income',
      month: 'Monthly income',
      year: 'Yearly income',
    },
    paid: 'Paid',
    debt: 'Debt',
    remaining: 'Remaining',
    statusPartial: 'Owing',
    addPayment: 'Record payment',
    paymentAmount: 'Payment amount',
    fullAmount: 'Full amount',
    payFull: 'Pay in full',
    totalDebt: 'Total debt',
    paymentHistory: 'Payment history',
    noPayments: 'No payments recorded',
    member: 'Member',
    paymentAdded: 'Payment recorded!',
    amountRequired: 'Enter payment amount!',
    initialPayment: 'Initial payment',
    debtors: 'Debtors',
    totalDue: 'Total charged',
    validUntil: 'Valid until',
    months: 'mo',
    monthsDue: 'Months charged',
    debtMonths: 'mo behind',
    startDate: 'Membership start',
    ledger: 'Account',
    prepaid: 'Prepaid',
    editMember: 'Edit member',
    editProduct: 'Edit product',
    confirmTitle: 'Are you sure you want to delete?',
    confirmText: 'This action cannot be undone.',
    yes: 'Yes',
    no: 'No',
    updated: 'Updated!',
    deleted: 'Deleted!',
    exportExcel: 'Export to Excel',
    page: 'Page',
    perPage: 'Per page',
    of: 'of',
    prev: 'Prev',
    next: 'Next',
    exported: 'File downloaded!',
    downloadBlocked: 'Browser blocked the download. Run the app in your own project.',
    exportError: 'Export error',
    total: 'Total',
    no_: '#',
    status: 'Status',
    actions: 'Actions',
    daily: 'Daily',
    alternate: 'Every other day',
    tariff: 'plan',
    statusActive: 'Active',
    statusOverdue: 'Overdue',

    // Actions
    addMember: 'Add member',
    searchPlaceholder: 'Search...',
    all: 'All',
    export: 'Export',
    save: 'Save',
    cancel: 'Cancel',
    nameRequired: 'Name is required!',
    memberAdded: 'Member added!',
    confirmDelete: 'Delete this member?',
    newMember: 'New member',

    // Records
    entryTime: 'Entry time',
    exitTime: 'Exit time',
    duration: 'Duration',
    hours: 'h',
    minutes: 'min',

    // Settings
    settingsPricing: 'Pricing',
    pricingDaily: 'For daily visitors',
    pricingAlternate: 'For alternate-day visitors',
    perMonth: 'per month',

    // Theme
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',

    comingSoon: 'module under development...',
  },
};

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

// ============================================
// THEME SWITCHER
// ============================================
function ThemeSwitcher({ theme, setTheme, darkMode, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { id: 'light', label: t.themeLight, icon: Sun },
    { id: 'dark', label: t.themeDark, icon: Moon },
    { id: 'system', label: t.themeSystem, icon: Monitor },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="ctl-btn h-10 flex items-center gap-2 px-3 rounded-lg border font-semibold text-sm leading-none transition"
      >
        <Monitor size={18} className="shrink-0" />
        <span className="hide-sm">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div
          className="ctl-menu absolute right-0 mt-2 w-52 rounded-xl border shadow-xl overflow-hidden z-50"
          style={{ animation: 'dropdownFade 0.15s ease-out' }}
        >
          {options.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); setOpen(false); }}
                className={`ctl-opt w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${isActive ? 'is-active' : ''}`}
              >
                <opt.icon size={18} className={isActive ? '' : 'opacity-60'} />
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && <Check size={18} className="gold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// LANGUAGE SWITCHER
// ============================================
function LanguageSwitcher({ lang, setLang, darkMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { id: 'uz', label: "O'zbekcha", short: 'UZ' },
    { id: 'ru', label: 'Русский', short: 'RU' },
    { id: 'en', label: 'English', short: 'EN' },
  ];

  const current = languages.find((l) => l.id === lang);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="ctl-btn h-10 flex items-center gap-2 px-3 rounded-lg border font-semibold text-sm leading-none transition"
      >
        <Globe size={18} className="shrink-0" />
        <span className="hide-sm">{current.short}</span>
        <span className="hide-sm">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div
          className="ctl-menu absolute right-0 mt-2 w-44 rounded-xl border shadow-xl overflow-hidden z-50"
          style={{ animation: 'dropdownFade 0.15s ease-out' }}
        >
          {languages.map((l) => {
            const isActive = lang === l.id;
            return (
              <button
                key={l.id}
                onClick={() => { setLang(l.id); setOpen(false); }}
                className={`ctl-opt w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${isActive ? 'is-active' : ''}`}
              >
                <span className="flex-1 text-left">{l.label}</span>
                {isActive && <Check size={18} className="gold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// ADMINISTRATOR MENYUSI
// ============================================
function UserMenu({ t, onLogout, onEditProfile, admin, darkMode, onInstall }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="ctl-btn h-10 flex items-center gap-2 px-3 rounded-lg border font-semibold text-sm leading-none transition"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <span className="hide-sm truncate max-w-[140px]">{admin?.name || t.administrator}</span>
        <UserRound size={18} className="only-sm" />
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div
          className="ctl-menu absolute right-0 mt-2 w-60 rounded-xl border shadow-xl overflow-hidden z-50"
          style={{ animation: 'dropdownFade 0.15s ease-out' }}
        >
          {/* Profil sarlavhasi */}
          <div className="menu-head flex items-center gap-3 px-4 py-3 border-b">
            {admin?.photo ? (
              <img src={admin.photo} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-yellow-400/15">
                <UserRound size={18} className="gold" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{admin?.name || t.administrator}</p>
              <p className="text-xs truncate">
                {admin?.login ? `@${admin.login}` : ''}
                {admin?.role ? ` · ${t.roleLabels?.[admin.role] || admin.role}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => { setOpen(false); onEditProfile?.(); }}
            className="ctl-opt w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition"
          >
            <Pencil size={18} className="opacity-70" />
            <span className="flex-1 text-left">{t.profileEdit}</span>
          </button>

          {onInstall && (
            <button
              onClick={() => { setOpen(false); onInstall(); }}
              className="ctl-opt w-full flex items-start gap-3 px-4 py-3 text-sm font-semibold transition"
            >
              <Download size={18} className="opacity-70 mt-0.5 shrink-0" />
              <span className="flex-1 text-left">
                {t.installApp}
                <span className="block text-xs opacity-60 font-normal mt-0.5">{t.installHint}</span>
              </span>
            </button>
          )}

          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="menu-danger w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition"
          >
            <LogOut size={18} />
            <span className="flex-1 text-left">{t.logout}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TOAST — burchakda chiqadigan xabar
// OK bosish shart emas, o'zi yo'qoladi
// ============================================
function Toasts({ items, onClose, darkMode }) {
  if (!items.length) return null;

  const icons = { success: CheckCircle, error: XCircle, info: Lightbulb };

  return (
    <div className={`grizzly-app gg ${darkMode ? 'dark' : 'light'} toast-wrap`}>
      {items.map((it) => {
        const Ic = icons[it.kind] || icons.info;
        return (
          <div key={it.id} className={`toast is-${it.kind}`} role="status">
            <span className="toast__ic"><Ic size={18} /></span>
            <p className="toast__text">{it.text}</p>
            <button className="toast__x" onClick={() => onClose(it.id)} aria-label="×">
              <X size={14} />
            </button>
            <span className="toast__bar" style={{ animationDuration: `${it.ms}ms` }} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// TO'LOV USULI TANLAGICH
// Faqat ma'lumot uchun — hisob-kitobga ta'sir qilmaydi
// ============================================
function MethodPick({ value, onChange, t }) {
  const opts = [
    { id: 'cash', label: t.cash, icon: Banknote },
    { id: 'card', label: t.card, icon: CreditCard },
  ];
  return (
    <div className="mpick">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`mpick-btn ${value === o.id ? 'is-on' : ''}`}
        >
          <o.icon size={17} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

// To'lov usulini kichik belgi sifatida ko'rsatish
function MethodTag({ method, t, size = 13 }) {
  const isCard = method === 'card';
  const Ic = isCard ? CreditCard : Banknote;
  return (
    <span className={`mtag ${isCard ? 'is-card' : 'is-cash'}`}>
      <Ic size={size} />
      {isCard ? t.card : t.cash}
    </span>
  );
}

// ============================================
// PERIOD CHART — davrga bog'liq chiziqli grafik
// ============================================
function PeriodChart({ buckets, locale, t }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const W = 1000, H = 260;
  const padL = 56, padR = 18, padT = 18, padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(1, ...buckets.map((b) => b.total));
  const step = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil(maxVal / step) * step || 1;

  const x = (i) => padL + (buckets.length === 1 ? innerW / 2 : (i * innerW) / (buckets.length - 1));
  const y = (v) => padT + innerH - (v / niceMax) * innerH;

  const linePath = (key) =>
    buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(b[key]).toFixed(1)}`).join(' ');

  const areaPath = (key) =>
    `${linePath(key)} L${x(buckets.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z`;

  const compact = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (px - padL) / innerW;
    const idx = Math.round(ratio * (buckets.length - 1));
    setHover(Math.max(0, Math.min(buckets.length - 1, idx)));
  };

  // X yorliqlari: ko'p bo'lsa oralatib chiqaramiz
  const labelEvery = Math.ceil(buckets.length / 12);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const hb = hover != null ? buckets[hover] : null;

  return (
    <div className="chart-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
        {/* Gorizontal to'r */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padL} x2={W - padR}
              y1={padT + innerH * g} y2={padT + innerH * g}
              className="chart-grid"
            />
            <text x={padL - 10} y={padT + innerH * g + 4} className="chart-ytick" textAnchor="end">
              {compact(Math.round(niceMax * (1 - g)))}
            </text>
          </g>
        ))}

        {/* Sotuv */}
        <path d={areaPath('sales')} className="chart-area is-sales" />
        <path d={linePath('sales')} className="chart-line is-sales" />

        {/* A'zolik */}
        <path d={areaPath('membership')} className="chart-area is-member" />
        <path d={linePath('membership')} className="chart-line is-member" />

        {/* Hover chizig'i */}
        {hb && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} className="chart-guide" />
        )}

        {/* Nuqtalar */}
        {buckets.map((b, i) => (
          <g key={i} opacity={hover === i ? 1 : 0}>
            <circle cx={x(i)} cy={y(b.membership)} r="4.5" className="chart-dot is-member" />
            <circle cx={x(i)} cy={y(b.sales)} r="4.5" className="chart-dot is-sales" />
          </g>
        ))}

        {/* X yorliqlari */}
        {buckets.map((b, i) =>
          i % labelEvery === 0 || i === buckets.length - 1 ? (
            <text key={i} x={x(i)} y={H - 10} className="chart-xtick" textAnchor="middle">
              {b.label}
            </text>
          ) : null
        )}
      </svg>

      {/* Tooltip */}
      {hb && (
        <div
          className="chart-tip"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > buckets.length / 2 ? 'translateX(-108%)' : 'translateX(8%)',
          }}
        >
          <p className="chart-tip-title">{hb.full || hb.label}</p>
          <div className="chart-tip-row">
            <span className="chart-tip-dot is-member" />
            <span className="flex-1">{t.membershipIncome}</span>
            <b>{hb.membership.toLocaleString(locale)}</b>
          </div>
          <div className="chart-tip-row">
            <span className="chart-tip-dot is-sales" />
            <span className="flex-1">{t.salesIncome}</span>
            <b>{hb.sales.toLocaleString(locale)}</b>
          </div>
          <div className="chart-tip-row is-total">
            <span className="flex-1">{t.total}</span>
            <b>{hb.total.toLocaleString(locale)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SANA FORMATI — DD-MM-YYYY / DD-MM-YYYY, HH:mm
// ============================================
const p2 = (n) => String(n).padStart(2, '0');

const fmtDate = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '—';
  return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const fmtDT = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '—';
  return `${fmtDate(d)}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

// ============================================
// SIG'ADIGAN QATORLAR SONI
// ============================================
function useFitRows(ref, rowH, headH, active) {
  const [rows, setRows] = useState(6);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const calc = () => {
      // Telefonda qatorlar pastroq bo'ladi
      const narrow = window.innerWidth < 768;
      const h = narrow ? Math.max(48, rowH - 12) : rowH;
      const fit = Math.floor((el.clientHeight - headH) / h);
      setRows(Math.max(2, fit));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    window.addEventListener('resize', calc);
    return () => { ro.disconnect(); window.removeEventListener('resize', calc); };
  }, [ref, rowH, headH, active]);

  return rows;
}

// ============================================
// SAHIFALASH BOSHQARUVI
// ============================================
function Pager({ page, totalPages, onPage, from, to, total, t }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="pg-btn" title={t.prev}>
        <ChevronLeft size={17} />
      </button>
      <span className="pg-info">
        {page} <span className="opacity-50">{t.of}</span> {totalPages}
      </span>
      <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="pg-btn" title={t.next}>
        <ChevronRight size={17} />
      </button>
      <span className="foot-sep" />
      <p className="ink-3 text-sm font-semibold whitespace-nowrap">
        {total === 0 ? 0 : from}–{to}<span className="opacity-60"> / {total}</span>
      </p>
    </div>
  );
}

// ============================================
// JOYLASHUV — panel ekranga sig'masa suriladi
// ============================================
const PANEL_W = 364;
const PANEL_H = 330;

// Panel ekranga sig'masa — yuqoriga yoki yon tomonga suriladi
function usePlacement(ref, open, w = PANEL_W, h = PANEL_H) {
  const [place, setPlace] = useState({ up: false, right: false });

  useEffect(() => {
    if (!open || !ref.current) return;
    const calc = () => {
      const r = ref.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const above = r.top;
      setPlace({
        up: below < h + 12 && above > below,
        right: r.left + w > window.innerWidth - 12,
      });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [open, ref, w, h]);

  return place;
}


// ============================================
// SELECT — zamonaviy tanlov ro'yxati
// ============================================
function Select({ value, onChange, options, placeholder, className = '', searchable = false, searchPlaceholder = '' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const place = usePlacement(ref, open, 0, 280);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const current = options.find((o) => String(o.value) === String(value));
  const shown = searchable && q.trim()
    ? options.filter((o) => String(o.label).toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  return (
    <div className={`sel ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`sel-btn ${open ? 'is-open' : ''}`}
      >
        <span className={`flex-1 text-left truncate ${current ? '' : 'sel-ph'}`}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown size={18} className={`sel-arrow ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className={`sel-menu ${place.up ? 'drop-up' : ''}`}>
          {searchable && (
            <div className="sel-search">
              <Search size={16} className="sel-search-ic" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                onClick={(e) => e.stopPropagation()}
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="sel-search-x">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          <div className="sel-list">
            {shown.length === 0 && <p className="sel-empty">{searchPlaceholder || '—'}</p>}

          {shown.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                className={`sel-opt ${active ? 'is-active' : ''}`}
              >
                <span className="flex-1 text-left truncate">{o.label}</span>
                {active && <Check size={16} className="shrink-0" />}
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DATETIME PICKER — kalendar + vaqt ustunlari
// ============================================
function DateTimePicker({ value, onChange, locale = 'uz-UZ', placeholder = '—', t, dateOnly = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const place = usePlacement(ref, open);

  const pad = (n) => String(n).padStart(2, '0');
  const parse = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d : null;
  };
  const selected = parse(value);
  const [view, setView] = useState(() => selected || new Date());

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Ochilganda tanlangan vaqtga scroll
  useEffect(() => {
    if (!open) return;
    const scrollTo = (el) => {
      const active = el?.querySelector('.is-sel');
      if (active) el.scrollTop = active.offsetTop - 8;
    };
    requestAnimationFrame(() => { scrollTo(hourRef.current); scrollTo(minRef.current); });
  }, [open]);

  const toValue = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const label = selected
    ? (dateOnly
        ? fmtDate(selected)
        : fmtDT(selected))
    : placeholder;

  const year = view.getFullYear();
  const month = view.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ d: prevMonthDays - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, out: false });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ d: cells.length - startOffset - daysInMonth + 1, out: true });
    if (cells.length >= 42) break;
  }

  const weekdays = (() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 2);
    });
  })();

  const monthLabel = view.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  const today = new Date();
  const sameDay = (d, ref2) =>
    !!ref2 && d === ref2.getDate() && month === ref2.getMonth() && year === ref2.getFullYear();

  const pickDay = (d) => {
    const base = selected || new Date();
    onChange(toValue(new Date(year, month, d, base.getHours(), base.getMinutes())));
    if (dateOnly) setOpen(false);
  };
  const setPart = (h, m) => {
    const base = selected || new Date();
    const next = new Date(base);
    if (h != null) next.setHours(h);
    if (m != null) next.setMinutes(m);
    onChange(toValue(next));
  };

  const curH = selected ? selected.getHours() : -1;
  const curM = selected ? selected.getMinutes() : -1;

  return (
    <div className="dtp" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className={`sel-btn ${open ? 'is-open' : ''}`}>
        <CalendarDays size={18} className="gold shrink-0" />
        <span className={`flex-1 text-left truncate ${selected ? '' : 'sel-ph'}`}>{label}</span>
        <ChevronDown size={18} className={`sel-arrow ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className={`dtp-panel ${place.up ? 'drop-up' : ''} ${place.right ? 'align-right' : ''}`}>
          <div className="dtp-body">
            {/* Kalendar */}
            <div className="dtp-cal">
              <div className="dtp-nav">
                <div className="flex items-center gap-0.5">
                  <button type="button" className="dtp-navbtn" title={String(year - 1)}
                    onClick={() => setView(new Date(year - 1, month, 1))}>
                    <ChevronsLeft size={16} />
                  </button>
                  <button type="button" className="dtp-navbtn"
                    onClick={() => setView(new Date(year, month - 1, 1))}>
                    <ChevronLeft size={16} />
                  </button>
                </div>

                <span className="dtp-month">{monthLabel}</span>

                <div className="flex items-center gap-0.5">
                  <button type="button" className="dtp-navbtn"
                    onClick={() => setView(new Date(year, month + 1, 1))}>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" className="dtp-navbtn" title={String(year + 1)}
                    onClick={() => setView(new Date(year + 1, month, 1))}>
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>

              <div className="dtp-grid dtp-week">
                {weekdays.map((w, i) => <span key={i}>{w}</span>)}
              </div>

              <div className="dtp-grid">
                {cells.slice(0, 42).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={c.out}
                    onClick={() => !c.out && pickDay(c.d)}
                    className={`dtp-day ${c.out ? 'is-out' : ''} ${
                      !c.out && sameDay(c.d, selected) ? 'is-sel' : ''
                    } ${!c.out && sameDay(c.d, today) && !sameDay(c.d, selected) ? 'is-today' : ''}`}
                  >
                    {c.d}
                  </button>
                ))}
              </div>
            </div>

            {/* Vaqt ustunlari */}
            {!dateOnly && (
            <div className="dtp-times">
              <div className="dtp-col" ref={hourRef}>
                {Array.from({ length: 24 }, (_, h) => (
                  <button key={h} type="button" onClick={() => setPart(h, null)}
                    className={`dtp-tick ${h === curH ? 'is-sel' : ''}`}>
                    {pad(h)}
                  </button>
                ))}
              </div>
              <div className="dtp-col" ref={minRef}>
                {Array.from({ length: 60 }, (_, m) => (
                  <button key={m} type="button" onClick={() => setPart(null, m)}
                    className={`dtp-tick ${m === curM ? 'is-sel' : ''}`}>
                    {pad(m)}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>

          <div className="dtp-foot">
            <button type="button" className="dtp-now"
              onClick={() => { const n = new Date(); setView(n); onChange(toValue(n)); }}>
              {t?.now || 'Now'}
            </button>
            <button type="button" className="gold-btn h-8 px-5 rounded-lg text-sm font-bold"
              onClick={() => setOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONFIRM — o'chirishni tasdiqlash
// ============================================
function ConfirmDialog({ open, onClose, onConfirm, title, text, name, yesLabel, noLabel, darkMode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`grizzly-app gg ${darkMode ? 'dark' : 'light'} confirm-root`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="confirm-box" role="alertdialog" aria-modal="true">
        <span className="confirm-icon">
          <AlertTriangle size={26} />
        </span>

        <h3 className="grizzly-title text-xl font-black ink-1 mt-4 text-center">{title}</h3>
        {name && <p className="text-sm font-bold gold mt-2 text-center break-words">{name}</p>}
        <p className="text-sm ink-3 mt-2 text-center">{text}</p>

        <div className="confirm-actions">
          <button onClick={onClose} className="confirm-btn is-cancel">
            {noLabel}
          </button>
          <button onClick={onConfirm} className="confirm-btn is-danger">
            <Trash2 size={17} />
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DRAWER — o'ng tomondan chiquvchi panel
// ============================================
function Drawer({ open, onClose, title, subtitle, icon: Icon, children, onSave, saveLabel, cancelLabel, darkMode, busy = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`grizzly-app gg ${darkMode ? 'dark' : 'light'} drawer-root`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <header className="drawer-head">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-yellow-400/15">
                <Icon size={20} className="gold" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="grizzly-title text-xl font-black ink-1 truncate">{title}</h3>
              {subtitle && <p className="text-sm ink-3 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="drawer-close shrink-0" aria-label="close">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-body">{children}</div>

        <footer className="drawer-foot">
          <button onClick={onClose} className="btn-muted h-11 px-6 rounded-lg font-bold transition">
            {cancelLabel}
          </button>
          <button
            onClick={onSave}
            disabled={busy}
            className="gold-btn h-11 px-8 rounded-lg font-bold transition hover:scale-[1.03] active:scale-95 disabled:opacity-60 disabled:cursor-default disabled:transform-none flex items-center gap-2"
          >
            {busy && <span className="spinner" />}
            {saveLabel}
          </button>
        </footer>
      </aside>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function GrizzlyGymSoftData() {
  // ---- Theme ----
  const [theme, setTheme] = useState('dark');   // standart holat — qorong'i
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const darkMode = theme === 'system' ? systemDark : theme === 'dark';

  // ---- Language ----
  const [lang, setLang] = useState('uz');
  const t = translations[lang];
  const locale = LOCALES[lang];

  // ---- Auth ----
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // ---- UI ----
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [prices, setPrices] = useState({ daily: 0, alternate: 0 });
  const [showPrices, setShowPrices] = useState(false);
  const [priceForm, setPriceForm] = useState({ daily: '', alternate: '' });

  const [admins, setAdmins] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ id: null, name: '', login: '', password: '', role: 'admin', photo: '' });

  const addMonths = (date, n) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() < day) d.setDate(0); // oy oxiri holati
    return d;
  };

  // ---------------------------------------------------------
  // Hisob-kitob: server yuborgan qiymat bo'lsa o'shani ishlatamiz,
  // aks holda mahalliy hisoblaymiz (demo rejim uchun)
  // ---------------------------------------------------------
  const monthsElapsed = (m) => {
    if (m.monthsElapsed != null) return m.monthsElapsed;
    const s0 = new Date(m.startDate);
    if (isNaN(s0)) return 1;
    const now = new Date();
    let n = (now.getFullYear() - s0.getFullYear()) * 12 + (now.getMonth() - s0.getMonth());
    if (now.getDate() >= s0.getDate()) n += 1;
    return Math.max(1, n);
  };

  const totalDue = (m) =>
    m.totalDue != null ? m.totalDue : monthsElapsed(m) * m.amount;

  const totalPaid = (m) =>
    m.totalPaid != null ? m.totalPaid : (m.payments || []).reduce((a, p) => a + p.amount, 0);

  const balanceOf = (m) =>
    m.balance != null ? m.balance : totalDue(m) - totalPaid(m);

  const debtOf = (m) =>
    m.debt != null ? m.debt : Math.max(0, balanceOf(m));

  const paidUntil = (m) => {
    if (m.paidUntil) return new Date(m.paidUntil);
    const covered = Math.floor(totalPaid(m) / m.amount);
    return addMonths(m.startDate, covered);
  };

  const debtMonths = (m) =>
    m.debtMonths != null ? m.debtMonths : Math.ceil(debtOf(m) / m.amount);

  // Holat: 0 qarz -> faol | 1 oygacha -> qarzdor | 1 oydan ko'p -> muddati o'tgan
  const getStatus = (m) => {
    if (m.status) return m.status;
    const d = debtOf(m);
    if (d <= 0) return 'active';
    return d > m.amount ? 'overdue' : 'partial';
  };


  const [members, setMembers] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [products, setProducts] = useState([]);

  const [sales, setSales] = useState([]);

  const [page, setPage] = useState(1);
  const tableAreaRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const isOwner = currentAdmin?.role === 'owner';
  const [serverDown, setServerDown] = useState(false);
  const [debtorsData, setDebtorsData] = useState([]);
  const setDebtors = setDebtorsData;
  const [overview, setOverview] = useState(null);
  const [soldToday, setSoldToday] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [periodStats, setPeriodStats] = useState(null);
  const [site, setSite] = useState(null);
  const [siteSaving, setSiteSaving] = useState(false);
  // ---- Toast xabarlari ----
  const [toasts, setToasts] = useState([]);
  const toastSeq = useRef(0);

  const dropToast = (id) => setToasts((list) => list.filter((x) => x.id !== id));

  const pushToast = (text, kind = 'success', ms = 3200) => {
    if (!text) return;
    const id = ++toastSeq.current;
    setToasts((list) => [...list.slice(-3), { id, text: String(text), kind, ms }]);
    setTimeout(() => dropToast(id), ms);
  };

  const toast = {
    ok:   (m) => pushToast(m, 'success'),
    err:  (m) => pushToast(m, 'error', 4800),
    info: (m) => pushToast(m, 'info'),
  };

  // Sinov loginlari faqat o'z kompyuterida ko'rinadi.
  // Serverga chiqarilganda yashiriladi — parollar ochiq turmasin.
  const isLocalRun =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

  // Yangi qo'shilgan yozuv bir necha soniya yoritilib turadi
  const [freshId, setFreshId] = useState(null);
  const markFresh = (id) => {
    setFreshId(id);
    setTimeout(() => setFreshId((cur) => (cur === id ? null : cur)), 2600);
  };

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '', login: '', photo: '', currentPassword: '', newPassword: '',
  });

  const [debtorPage, setDebtorPage] = useState(1);
  const [debtorSearch, setDebtorSearch] = useState('');
  const [debtorOpen, setDebtorOpen] = useState(null);
  const [debtorPayAmount, setDebtorPayAmount] = useState('');
  const [debtorPayMethod, setDebtorPayMethod] = useState('cash');
  const [lightbox, setLightbox] = useState(null);
  const debtorsAreaRef = useRef(null);

  const [productPage, setProductPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [salesSearch, setSalesSearch] = useState('');
  const productsAreaRef = useRef(null);
  const salesAreaRef = useRef(null);

  const [period, setPeriod] = useState('day');
  const [periodDate, setPeriodDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [confirmState, setConfirmState] = useState({ open: false, name: '', onYes: null });
  const askDelete = (name, onYes) => setConfirmState({ open: true, name, onYes });
  const closeConfirm = () => setConfirmState({ open: false, name: '', onYes: null });

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payForm, setPayForm] = useState({ memberId: '', amount: '', at: '', method: 'cash' });
  const [showAddSale, setShowAddSale] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [saleForm, setSaleForm] = useState({ items: [], buyer: '', paid: '', method: 'cash' });
  const [itemDraft, setItemDraft] = useState({ productId: '', qty: 1 });
  const [salePayForm, setSalePayForm] = useState({ saleId: null, amount: '', method: 'cash' });
  const [productForm, setProductForm] = useState({ id: null, name: '', price: '' });

  const nowDate = () => new Date().toISOString().split('T')[0];
  const nowLocal = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    id: null, name: '', phone: '', photo: '', type: 'daily',
    joinDate: nowDate(),
    paymentAt: nowLocal(),
    initialPaid: '', method: 'cash',
  });

  // ---- Handlers ----
  const handleLogout = () => {
    writeToken('');
    setCurrentAdmin(null);
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setAdminEmail('');
    setAdminPassword('');
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setLoginError(t.loginRequired);
      return;
    }

    setLoading(true);
    setLoginError('');
    try {
      const { token, admin } = await api.login(adminEmail.trim(), adminPassword);
      writeToken(token);
      setCurrentAdmin(admin);
      setIsLoggedIn(true);
      setServerDown(false);
    } catch (err) {
      if (err.message === 'NETWORK') {
        setServerDown(true);
        setLoginError(t.serverDown);
      } else {
        setLoginError(t.wrongCredentials);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name.trim()) { toast.err(t.nameRequired); return; }

    const { id, paymentAt, initialPaid, joinDate, ...rest } = formData;


    setLoading(true);
    try {
      if (id) {
        await api.members.update(id, {
          name: rest.name,
          phone: rest.phone,
          photo: rest.photo,
          type: rest.type,
          startDate: String(paymentAt).split('T')[0],
        });
        toast.ok(t.updated);
      } else {
        const created = await api.members.create({
          name: rest.name,
          phone: rest.phone,
          photo: rest.photo,
          type: rest.type,
          startDate: String(paymentAt).split('T')[0],
          initialPaid: Math.max(0, Number(initialPaid) || 0),
          paidAt: paymentAt,
          method: formData.method,
        });
        markFresh(created?.id);
        toast.ok(t.memberAdded);
      }
      await Promise.all([reloadMembers(), reloadStats(), reloadDebtors()]);
      resetMemberForm();
      setShowAddMember(false);        // faqat muvaffaqiyatdan keyin yopamiz
      setPage(1);                     // yangi a'zo birinchi sahifada
    } catch (err) {
      toast.err(err.message === 'NETWORK' ? t.serverDown : err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetMemberForm = () => setFormData({
    id: null, name: '', phone: '', photo: '', type: 'daily',
    joinDate: nowDate(), paymentAt: nowLocal(), initialPaid: '', method: 'cash',
  });

  const openNewMember = () => { resetMemberForm(); setShowAddMember(true); };

  const openEditMember = (m) => {
    setFormData({
      id: m.id,
      name: m.name,
      phone: m.phone || '',
      photo: m.photo || '',
      type: m.type,
      joinDate: m.startDate,
      paymentAt: `${m.startDate}T00:00`,
      initialPaid: '',
    });
    setShowAddMember(true);
  };

  const deleteMember = (m) => askDelete(m.name, async () => {
    closeConfirm();
    try {
      await api.members.remove(m.id);
      await Promise.all([reloadMembers(), reloadStats(), reloadDebtors()]);
      toast.ok(t.deleted);
    } catch (err) {
      toast.err(err.message === 'NETWORK' ? t.serverDown : err.message);
    }
  });

  // ---- Sotuv ----
  const cartTotal = saleForm.items.reduce((a, it) => a + it.total, 0);

  const addCartItem = () => {
    const product = products.find((p) => p.id === Number(itemDraft.productId));
    const qty = Math.max(1, Number(itemDraft.qty) || 0);
    if (!product) { toast.err(t.nameRequired); return; }

    setSaleForm((f) => {
      const idx = f.items.findIndex((it) => it.productId === product.id);
      const items = [...f.items];
      if (idx >= 0) {
        const q = items[idx].qty + qty;
        items[idx] = { ...items[idx], qty: q, total: q * product.price };
      } else {
        items.push({
          productId: product.id,
          productName: product.name,
          qty,
          unitPrice: product.price,
          total: product.price * qty,
        });
      }
      return { ...f, items };
    });
    setItemDraft({ productId: '', qty: 1 });
  };

  const removeCartItem = (productId) =>
    setSaleForm((f) => ({ ...f, items: f.items.filter((it) => it.productId !== productId) }));

  const changeCartQty = (productId, delta) =>
    setSaleForm((f) => ({
      ...f,
      items: f.items.flatMap((it) => {
        if (it.productId !== productId) return [it];
        const q = it.qty + delta;
        return q <= 0 ? [] : [{ ...it, qty: q, total: q * it.unitPrice }];
      }),
    }));

  const handleAddSale = async () => {
    if (saleForm.items.length === 0) { toast.err(t.emptyCart); return; }

    const total = cartTotal;
    const paid = saleForm.paid === '' ? total : Math.max(0, Math.min(total, Number(saleForm.paid) || 0));
    const buyerMember = members.find((m) => m.name === saleForm.buyer);

    setLoading(true);
    try {
      const created = await api.sales.create({
        items: saleForm.items.map((it) => ({ productId: it.productId, qty: it.qty })),
        buyerId: buyerMember ? buyerMember.id : undefined,
        buyerName: buyerMember ? undefined : (saleForm.buyer || undefined),
        paid,
        method: saleForm.method,
      });
      await reloadAfterSale();
      setSaleForm({ items: [], buyer: '', paid: '', method: 'cash' });
      setItemDraft({ productId: '', qty: 1 });
      setShowAddSale(false);
      setSalesPage(1);
      markFresh(created?.id);
      toast.ok(t.saleAdded);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => setProductForm({ id: null, name: '', price: '' });
  const openNewProduct = () => { resetProductForm(); setShowAddProduct(true); };
  const openEditProduct = (p) => {
    setProductForm({ id: p.id, name: p.name, price: String(p.price) });
    setShowAddProduct(true);
  };

  const handleAddProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) { toast.err(t.nameRequired); return; }
    const data = { name: productForm.name.trim(), price: Number(productForm.price) };

    setLoading(true);
    try {
      if (productForm.id) {
        await api.products.update(productForm.id, data);
        toast.ok(t.updated);
      } else {
        const created = await api.products.create(data);
        markFresh(created?.id);
        toast.ok(t.productAdded);
      }
      await reloadProducts();
      resetProductForm();
      setShowAddProduct(false);
      setProductPage(1);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = (p) => askDelete(p.name, async () => {
    closeConfirm();
    try {
      await api.products.remove(p.id);
      await reloadProducts();
      toast.ok(t.deleted);
    } catch (err) { handleApiError(err); }
  });

  // ---- To'lov qabul qilish ----
  const handleAddPayment = async () => {
    const member = members.find((m) => m.id === Number(payForm.memberId));
    const sum = Number(payForm.amount);
    if (!member) { toast.err(t.nameRequired); return; }
    if (!sum || sum <= 0) { toast.err(t.amountRequired); return; }

    setLoading(true);
    try {
      await api.payments.create({ memberId: member.id, amount: sum, paidAt: payForm.at, method: payForm.method });
      await reloadAfterPayment();
      setPayForm({ memberId: '', amount: '', at: nowLocal(), method: 'cash' });
      setShowAddPayment(false);
      toast.ok(t.paymentAdded);
    } catch (err) {
      toast.err(err.message === 'NETWORK' ? t.serverDown : err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPayment = (memberId) => {
    setPayForm({ memberId: String(memberId), amount: '', at: nowLocal(), method: 'cash' });
    setShowAddPayment(true);
  };

  // ---- Faylni saqlash (bir nechta zaxira usul bilan) ----
  const saveBlob = async (blob, filename) => {
    // 1) Zamonaviy Chrome/Edge — haqiqiy "Saqlash" oynasi
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Excel',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return true;
      } catch (err) {
        if (err?.name === 'AbortError') return true; // foydalanuvchi bekor qildi
        // aks holda keyingi usulga o'tamiz
      }
    }

    // 2) Odatiy havola orqali yuklab olish
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (err) {
      // 3) Yangi oynada ochish
      const win = window.open(url, '_blank');
      if (!win) {
        toast.ok(t.downloadBlocked);
        URL.revokeObjectURL(url);
        return false;
      }
      return true;
    }
  };

  // ---- Sotuv qarzi ----
  const salePaid = (x) => (x.paid == null ? x.total : x.paid);
  const saleDebt = (x) => Math.max(0, x.total - salePaid(x));

  const settleSale = async (x, amount) => {
    const add = Math.max(0, Math.min(saleDebt(x), Number(amount) || 0));
    if (add <= 0) { toast.err(t.amountRequired); return; }
    setLoading(true);
    try {
      await api.sales.pay(x.id, add, salePayForm.method);
      await reloadAfterSale();
      setSalePayForm({ saleId: null, amount: '', method: 'cash' });
      setDebtorOpen(null);
      toast.ok(t.paymentAdded);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // MA'LUMOTLARNI YUKLASH
  // =========================================================
  const handleApiError = (err) => {
    if (err.message === 'UNAUTHORIZED') return;
    if (err.message === 'NETWORK') { setServerDown(true); toast.err(t.serverDown); return; }
    toast.err(err.message || t.loadError);
  };

  const reloadMembers  = () => api.members.list().then(setMembers).catch(handleApiError);
  const reloadProducts = () => api.products.list().then(setProducts).catch(handleApiError);
  const reloadSales    = () => api.sales.list().then(setSales).catch(handleApiError);
  const reloadDebtors  = () => api.debtors.list().then(setDebtorsData).catch(handleApiError);
  const reloadAdmins   = () => api.admins.list().then(setAdmins).catch(() => {});
  const reloadStats    = () => api.stats.overview().then(setOverview).catch(handleApiError);
  const reloadSold     = () => api.stats.soldToday().then(setSoldToday).catch(handleApiError);

  // Sotuvdan keyin bir nechta bo'lim yangilanadi
  const reloadAfterSale = () =>
    Promise.all([reloadSales(), reloadSold(), reloadStats(), reloadDebtors()]);

  // A'zolik to'lovidan keyin
  const reloadAfterPayment = () =>
    Promise.all([reloadMembers(), reloadStats(), reloadDebtors()]);

  // Kirgandan keyin hammasini bir marta yuklaymiz
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [ms, ps, ss, ds, as, pr, ov, st, si] = await Promise.all([
          api.members.list(),
          api.products.list(),
          api.sales.list(),
          api.debtors.list(),
          api.admins.list().catch(() => []),   // ruxsat bo'lmasa bo'sh ro'yxat
          api.settings.getPrices(),
          api.stats.overview(),
          api.stats.soldToday(),
          api.site.get(),
        ]);
        if (!alive) return;
        setMembers(ms); setProducts(ps); setSales(ss); setDebtorsData(ds);
        setAdmins(as); setPrices(pr); setOverview(ov); setSoldToday(st); setSite(si);
        setServerDown(false);
      } catch (err) {
        if (alive) handleApiError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [isLoggedIn]);

  // Grafik — davr yoki ma'lumot o'zgarganda
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    api.stats.chart(period, periodDate)
      .then((d) => { if (alive) setChartData(d); })
      .catch(() => {});
    api.stats.period(period, periodDate)
      .then((d) => { if (alive) setPeriodStats(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isLoggedIn, period, periodDate, sales, members]);

  // Mobil menyu: Escape bilan yopiladi
  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileNav(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNav]);

  // Ekran kengaysa mobil menyu yopiladi
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileNav(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Ruxsati yo'q bo'limda turgan bo'lsa boshqaruvga qaytaramiz
  useEffect(() => {
    if (!isOwner && (activeTab === 'settings' || activeTab === 'site')) {
      setActiveTab('dashboard');
    }
  }, [isOwner, activeTab]);

  // Brauzer dasturni o'rnatishga tayyor bo'lganda tugma ko'rsatamiz
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const runInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // 401 kelganda login sahifasiga qaytaramiz
  useEffect(() => {
    onAuthLost = () => { setIsLoggedIn(false); setCurrentAdmin(null); };
    return () => { onAuthLost = () => {}; };
  }, []);

  // =========================================================
  // ADMINLAR
  // =========================================================
  const resetAdminForm = () =>
    setAdminForm({ id: null, name: '', login: '', password: '', role: 'admin', photo: '' });

  const openNewAdmin = () => { resetAdminForm(); setShowAdmin(true); };

  const openEditAdmin = (a) => {
    setAdminForm({ id: a.id, name: a.name, login: a.login, password: '', role: a.role, photo: a.photo || '' });
    setShowAdmin(true);
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.name.trim()) { toast.err(t.nameRequired); return; }
    if (!adminForm.login.trim()) { toast.err(t.loginRequired); return; }

    const data = {
      name: adminForm.name.trim(),
      login: adminForm.login.trim(),
      role: adminForm.role,
      photo: adminForm.photo,
    };
    if (adminForm.password) data.password = adminForm.password;

    if (!adminForm.id && !data.password) { toast.err(t.passwordRequired); return; }

    setLoading(true);
    try {
      if (adminForm.id) {
        await api.admins.update(adminForm.id, data);
        toast.ok(t.updated);
      } else {
        const created = await api.admins.create(data);
        markFresh(created?.id);
        toast.ok(t.adminAdded);
      }
      await reloadAdmins();
      resetAdminForm();
      setShowAdmin(false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAdmin = (a) => askDelete(a.name, async () => {
    closeConfirm();
    try {
      await api.admins.remove(a.id);
      await reloadAdmins();
      toast.ok(t.deleted);
    } catch (err) { handleApiError(err); }
  });

  const roleLabel = { owner: t.roleOwner, admin: t.roleAdmin, cashier: t.roleCashier };

  // =========================================================
  // MENING HISOBIM
  // =========================================================
  const openProfile = () => {
    setProfileForm({
      name: currentAdmin?.name || '',
      login: currentAdmin?.login || '',
      photo: currentAdmin?.photo || '',
      currentPassword: '',
      newPassword: '',
    });
    setShowProfile(true);
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) { toast.err(t.nameRequired); return; }
    if (!profileForm.login.trim()) { toast.err(t.loginRequired); return; }

    const payload = {
      name: profileForm.name.trim(),
      login: profileForm.login.trim(),
      photo: profileForm.photo,
    };
    if (profileForm.newPassword) {
      payload.currentPassword = profileForm.currentPassword;
      payload.newPassword = profileForm.newPassword;
    }

    setLoading(true);
    try {
      const { admin, token } = await api.updateMe(payload);
      writeToken(token);                 // login o'zgargan bo'lsa token yangilanadi
      setCurrentAdmin(admin);
      if (isOwner) await reloadAdmins();
      setShowProfile(false);
      toast.ok(t.profileSaved);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SAYT SOZLAMALARI
  // =========================================================
  const patchSite = (patch) => setSite((s0) => ({ ...s0, ...patch }));

  const patchGallery = (i, patch) =>
    setSite((s0) => ({
      ...s0,
      gallery: s0.gallery.map((g, k) => (k === i ? { ...g, ...patch } : g)),
    }));

  const patchHours = (i, patch) =>
    setSite((s0) => ({
      ...s0,
      hours: s0.hours.map((h, k) => (k === i ? { ...h, ...patch } : h)),
    }));

  const patchFaq = (i, patch) =>
    setSite((s0) => ({ ...s0, faq: s0.faq.map((f, k) => (k === i ? { ...f, ...patch } : f)) }));

  const addFaqRow = () =>
    setSite((s0) => ({ ...s0, faq: [...(s0.faq || []), { q: '', a: '' }] }));

  const removeFaqRow = (i) =>
    setSite((s0) => ({ ...s0, faq: s0.faq.filter((_, k) => k !== i) }));

  const addHourRow = () =>
    setSite((s0) => ({ ...s0, hours: [...s0.hours, { day: '', time: '' }] }));

  const removeHourRow = (i) =>
    setSite((s0) => ({ ...s0, hours: s0.hours.filter((_, k) => k !== i) }));

  const addGallerySlot = () =>
    setSite((s0) => ({ ...s0, gallery: [...s0.gallery, { caption: '', src: '' }] }));

  const removeGallerySlot = (i) =>
    setSite((s0) => ({ ...s0, gallery: s0.gallery.filter((_, k) => k !== i) }));

  // Rasmni base64 ga o'girib saqlaymiz
  const pickGalleryImage = (i, file) => {
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.err(t.imageHint); return; }
    const reader = new FileReader();
    reader.onload = () => patchGallery(i, { src: reader.result });
    reader.readAsDataURL(file);
  };

  const moveGallery = (i, dir) =>
    setSite((s0) => {
      const j = i + dir;
      if (j < 0 || j >= s0.gallery.length) return s0;
      const g = [...s0.gallery];
      [g[i], g[j]] = [g[j], g[i]];
      return { ...s0, gallery: g };
    });

  const saveSite = async () => {
    setSiteSaving(true);
    try {
      const saved = await api.site.save(site);
      setSite(saved);
      toast.ok(t.siteSaved);
    } catch (err) { handleApiError(err); }
    finally { setSiteSaving(false); }
  };

  // =========================================================
  // NARXLAR
  // =========================================================
  const openPrices = () => {
    setPriceForm({ daily: String(prices.daily), alternate: String(prices.alternate) });
    setShowPrices(true);
  };

  const savePrices = async () => {
    const d = Number(priceForm.daily) || 0;
    const a = Number(priceForm.alternate) || 0;
    if (d <= 0 || a <= 0) { toast.err(t.amountRequired); return; }
    setLoading(true);
    try {
      const saved = await api.settings.setPrices({ daily: d, alternate: a });
      setPrices(saved);
      await reloadMembers();
      setShowPrices(false);
      toast.ok(t.updated);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Excelga eksport ----
  const exportMembersToExcel = async () => {
    try {
      const statusLabel = { active: t.statusActive, partial: t.statusPartial, overdue: t.statusOverdue };

      const rows = filteredMembers.map((m, i) => ({
        [t.no_]: i + 1,
        [t.name]: m.name,
        [t.phone]: m.phone || '',
        [t.type]: m.type === 'daily' ? t.daily : t.alternate,
        [t.monthsDue]: monthsElapsed(m),
        [t.totalDue]: totalDue(m),
        [t.paid]: totalPaid(m),
        [t.debt]: debtOf(m),
        [t.validUntil]: fmtDate(paidUntil(m)),
        [t.status]: statusLabel[getStatus(m)],
      }));

      rows.push({
        [t.no_]: '',
        [t.name]: t.total,
        [t.phone]: '',
        [t.type]: '',
        [t.monthsDue]: '',
        [t.totalDue]: filteredMembers.reduce((a, m) => a + totalDue(m), 0),
        [t.paid]: filteredMembers.reduce((a, m) => a + totalPaid(m), 0),
        [t.debt]: filteredMembers.reduce((a, m) => a + debtOf(m), 0),
        [t.validUntil]: '',
        [t.status]: '',
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members');  // varaq nomida maxsus belgilar bo'lmasligi kerak

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await saveBlob(blob, `Grizzly-${nowDate()}.xlsx`);
    } catch (err) {
      console.error(err);
      toast.ok(`${t.exportError}: ${err?.message || err}`);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(q) || (m.phone || '').includes(q);
    const st = getStatus(m);
    const matchesFilter = filterType === 'all' || m.type === filterType || st === filterType;
    return matchesSearch && matchesFilter;
  });

  const fmtDateTime = (v) => (String(v).includes('T') ? fmtDT(v) : fmtDate(v));

  // Tanlangan davr oralig'i
  const periodRange = (() => {
    const base = new Date(periodDate);
    const from = new Date(base);
    const to = new Date(base);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (period === 'week') {
      const dow = (from.getDay() + 6) % 7;   // dushanba = 0
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
    return { from, to };
  })();

  const inPeriod = (v) => {
    const d = new Date(v);
    return !isNaN(d) && d >= periodRange.from && d <= periodRange.to;
  };

  const periodLabel = period === 'day'
    ? fmtDate(periodRange.from)
    : `${fmtDate(periodRange.from)} — ${fmtDate(periodRange.to)}`;

  // Davr bo'yicha daromadlar
  const periodMembershipIncome = members.reduce(
    (sum, m) => sum + (m.payments || []).filter((p) => inPeriod(p.at)).reduce((a, p) => a + p.amount, 0),
    0
  );
  const periodSalesIncome = sales.filter((x) => inPeriod(x.date)).reduce((a, x) => a + salePaid(x), 0);
  const periodTotalIncome = periodMembershipIncome + periodSalesIncome;

  // Grafik — serverdan kelgan bo'laklar
  const chartBuckets = chartData.map((b) => ({
    label: b.label,
    full: b.label,
    membership: b.membership,
    sales: b.sales,
    total: b.total,
  }));

  // =========================================================
  // SAHIFALASH — har bir jadval mavjud balandlikka moslashadi
  // =========================================================

  // ---- A'zolar ----
  const rowsPerPage = useFitRows(tableAreaRef, 73, 53, activeTab === 'members');
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  useEffect(() => { setPage(1); }, [searchQuery, filterType, rowsPerPage]);

  // ---- Mahsulotlar ----
  const productRows = useFitRows(productsAreaRef, 52, 47, activeTab === 'sales');
  const productTotalPages = Math.max(1, Math.ceil(products.length / productRows));
  const productSafePage = Math.min(productPage, productTotalPages);
  const pagedProducts = products.slice((productSafePage - 1) * productRows, productSafePage * productRows);
  useEffect(() => { setProductPage(1); }, [productRows]);

  // ---- Sotuvlar ----
  const filteredSales = sales.filter((x) => {
    const q = salesSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (x.buyer || '').toLowerCase().includes(q) ||
      (x.items || []).some((it) => it.productName.toLowerCase().includes(q))
    );
  });
  const salesRows = useFitRows(salesAreaRef, 52, 47, activeTab === 'sales');
  const salesTotalPages = Math.max(1, Math.ceil(filteredSales.length / salesRows));
  const salesSafePage = Math.min(salesPage, salesTotalPages);
  const pagedSales = filteredSales.slice((salesSafePage - 1) * salesRows, salesSafePage * salesRows);
  useEffect(() => { setSalesPage(1); }, [salesSearch, salesRows]);

  // ---- Qarzdorlar ----
  const unpaidSalesOf = (row) => {
    if (!row) return [];
    return sales.filter((x) => {
      if (saleDebt(x) <= 0) return false;
      return row.member ? x.memberId === row.member.id : !x.memberId;
    });
  };

  const debtorList = debtorsData.map((d) => ({
    id: d.id,
    member: d.id === 'guest' ? null : members.find((m) => m.id === d.id) || null,
    name: d.name || t.guest,
    phone: d.phone || '',
    photo: d.photo || '',
    memberDebt: d.memberDebt,
    saleDebtSum: d.saleDebt,
    total: d.total,
  }));

  const filteredDebtors = debtorList.filter((r) => {
    const q = debtorSearch.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.phone.includes(q);
  });

  const debtorRows = useFitRows(debtorsAreaRef, 73, 53, activeTab === 'debtors');
  const debtorTotalPages = Math.max(1, Math.ceil(filteredDebtors.length / debtorRows));
  const debtorSafePage = Math.min(debtorPage, debtorTotalPages);
  const pagedDebtors = filteredDebtors.slice((debtorSafePage - 1) * debtorRows, debtorSafePage * debtorRows);
  useEffect(() => { setDebtorPage(1); }, [debtorSearch, debtorRows]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // ⚠️ DAROMAD FAQAT HAQIQATDA KELGAN PULDAN HISOBLANADI.
  // Qarz (totalDue / balanceOf) hech qachon daromadga qo'shilmaydi —
  // u to'langanda payments massiviga tushadi va o'shanda hisobga kiradi.
  const allMembershipIncome = members.reduce(
    (sum, m) => sum + (m.payments || []).reduce((a, p) => a + p.amount, 0),
    0
  );
  const allSalesIncome = sales.reduce((a, x) => a + salePaid(x), 0);
  const allRevenue = allMembershipIncome + allSalesIncome;

  // Joriy oy bo'yicha
  const membershipIncome = members.reduce(
    (sum, m) => sum + (m.payments || [])
      .filter((p) => String(p.at).startsWith(currentMonth))
      .reduce((a, p) => a + p.amount, 0),
    0
  );
  const totalDebt = members.reduce((sum, m) => sum + debtOf(m), 0);
  const monthSales = sales.filter((x) => x.date.startsWith(currentMonth));
  const salesIncome = monthSales.reduce((sum, x) => sum + salePaid(x), 0);
  const todaySales = sales.filter((x) => x.date === todayStr);
  const todayIncome = todaySales.reduce((sum, x) => sum + salePaid(x), 0);
  const salesDebtTotal = sales.reduce((sum, x) => sum + saleDebt(x), 0);

  // Bugun sotilgan mahsulotlar — serverdan
  const todayByProduct = soldToday;


  const stats = {
    totalMembers: overview?.totalMembers ?? members.length,
    activeMembers: overview?.activeMembers ?? members.filter((m) => getStatus(m) !== 'overdue').length,
    overdueMembers: overview?.overdueMembers ?? members.filter((m) => getStatus(m) === 'overdue').length,
    debtors: overview?.debtors ?? members.filter((m) => getStatus(m) === 'partial').length,
    totalDebt: overview?.membershipDebt ?? totalDebt,
    membershipIncome,
    salesIncome,
    todayIncome,
    salesDebtTotal: overview?.salesDebt ?? salesDebtTotal,
    monthlyRevenue: membershipIncome + salesIncome,
    allMembershipIncome: overview?.membershipIncome ?? allMembershipIncome,
    allSalesIncome: overview?.salesIncome ?? allSalesIncome,
    allRevenue: overview?.totalIncome ?? allRevenue,
    cashIncome: overview?.cashIncome ?? 0,
    cardIncome: overview?.cardIncome ?? 0,
  };


  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

    /* Poppins — butun interfeys uchun */
    .grizzly-app,
    .grizzly-app *,
    .grizzly-app input,
    .grizzly-app select,
    .grizzly-app option,
    .grizzly-app textarea,
    .grizzly-app button {
      font-family: 'Poppins', sans-serif;
    }

    .grizzly-app input::placeholder,
    .grizzly-app textarea::placeholder {
      font-family: 'Poppins', sans-serif;
    }

    .grizzly-title {
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    /* ---- Scrollbar: nozik oltin ---- */
    html, body {
      scrollbar-width: thin;
      scrollbar-color: #F2BD00 transparent;
    }
    html::-webkit-scrollbar, body::-webkit-scrollbar { width: 4px; height: 4px; }
    html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: transparent; }
    html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
      background: #F2BD00;
      border-radius: 999px;
    }

    .grizzly-app *,
    .grizzly-app {
      scrollbar-width: thin;
      scrollbar-color: #F2BD00 transparent;
    }

    .grizzly-app *::-webkit-scrollbar,
    .grizzly-app::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    .grizzly-app *::-webkit-scrollbar-track,
    .grizzly-app::-webkit-scrollbar-track {
      background: transparent;
    }

    .grizzly-app *::-webkit-scrollbar-thumb,
    .grizzly-app::-webkit-scrollbar-thumb {
      background: #F2BD00;
      border-radius: 999px;
      transition: background 0.2s ease;
    }

    .grizzly-app *::-webkit-scrollbar-thumb:hover,
    .grizzly-app::-webkit-scrollbar-thumb:hover {
      background: #FFD700;
    }

    .grizzly-app *::-webkit-scrollbar-corner,
    .grizzly-app::-webkit-scrollbar-corner {
      background: transparent;
    }

    /* Yon panellarda yanada nozikroq */
    .dtp-col::-webkit-scrollbar,
    .sel-menu::-webkit-scrollbar {
      width: 3px;
    }

    /* Brend oltin rangi — fonga qarab moslashadi */
    .gold { color: #FFD700; }
    .gg.light .gold,
    .login-right.light .gold,
    .ctl.light .gold { color: #8a6100; }

    /* Brend sarlavhalari — har doim yorqin oltin */
    .gold-fixed,
    .gg.light .gold-fixed,
    .login-right.light .gold-fixed { color: #FFD700; }

    /* Oltin tugma va jadval sarlavhalari */
    .gold-btn {
      background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%);
      color: #1a1400;
    }
    .gg.light .gold-btn,
    .login-right.light .gold-btn {
      background: linear-gradient(135deg, #FFCE1F 0%, #EDB200 100%);
      color: #1a1400;
      box-shadow: 0 1px 2px rgba(201, 151, 0, 0.28), 0 6px 16px -4px rgba(201, 151, 0, 0.35);
    }
    .gg.light .gold-btn:hover {
      box-shadow: 0 2px 4px rgba(201, 151, 0, 0.30), 0 10px 22px -6px rgba(201, 151, 0, 0.45);
    }


    /* ---- Boshqaruv tugmalari va dropdown (login + dashboard) ---- */
    .ctl-btn {
      background: var(--surface, rgba(255, 255, 255, 0.06));
      border-color: var(--brd, rgba(255, 215, 0, 0.22));
      color: var(--ink-2, #e8e8e8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .ctl-btn:hover { background: var(--hover, rgba(255, 215, 0, 0.12)); }

    .ctl-menu {
      background: var(--menu-bg, #141414);
      border-color: var(--brd, rgba(255, 215, 0, 0.22));
      box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6);
      color: var(--ink-1, #f5f5f5);
    }
    .gg.light .ctl-menu, .ctl.light .ctl-menu { color: #0a0a0a; }
    .ctl-opt { color: var(--ink-2, #e8e8e8); }
    .ctl-opt:hover { background: var(--hover, rgba(255, 215, 0, 0.10)); }
    .ctl-opt.is-active {
      background: rgba(255, 215, 0, 0.12);
      color: #FFD700;
    }

    /* Menyudagi xavfli amal (Chiqish) */
    .menu-danger { color: #f87171; }
    .menu-danger:hover { background: rgba(239, 68, 68, 0.12); }
    .gg.light .menu-danger { color: #dc2626; }
    .gg.light .menu-danger:hover { background: rgba(220, 38, 38, 0.10); }

    /* Menyu ichidagi profil bloki */
    .menu-head { border-color: var(--brd, rgba(255, 215, 0, 0.18)); }
    .menu-head p:first-child { color: var(--ink-1, #f5f5f5); }
    .menu-head p:last-child  { color: var(--ink-3, #8a8a8a); }
    .gg.light .menu-head p:first-child { color: #0a0a0a; }
    .gg.light .menu-head p:last-child  { color: #6e6e6e; }

    /* Dasturchi havolasi */
    .dev-link {
      color: var(--ink-3, #8a8a8a);
      border: 1px dashed var(--brd, rgba(255, 215, 0, 0.18));
    }
    .dev-link:hover {
      color: #FFD700;
      border-color: rgba(255, 215, 0, 0.5);
      background: rgba(255, 215, 0, 0.08);
    }
    .gg.light .dev-link:hover { color: #8a6100; }

    /* Yorug' rejim */
    .gg.light .ctl-menu, .ctl.light .ctl-menu {
      background: #ffffff;
      box-shadow: 0 12px 28px -10px rgba(10, 10, 10, 0.28);
      color: #0a0a0a;
    }
    .gg.light .ctl-opt, .ctl.light .ctl-opt { color: #525252; }
    .gg.light .ctl-opt.is-active, .ctl.light .ctl-opt.is-active { color: #8a6100; }

    /* Rasm yuklash tugmasi */
    .photo-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: 9px;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      color: var(--ink-1, #f5f5f5);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .photo-btn:hover {
      background: var(--hover, rgba(255, 215, 0, 0.12));
      border-color: rgba(255, 215, 0, 0.45);
    }
    .gg.light .photo-btn { background: #ffffff; }

    /* ---- Select ---- */
    .sel { position: relative; }

    .sel-btn {
      width: 100%;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border-radius: 10px;
      border: 2px solid var(--brd, rgba(255, 215, 0, 0.14));
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      color: var(--ink-1, #f5f5f5);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }
    .sel-btn:hover { border-color: rgba(255, 215, 0, 0.45); }
    .sel-btn.is-open {
      border-color: #FFD700;
      box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.12);
    }
    .sel-ph { color: var(--ph, rgba(255, 255, 255, 0.35)); font-weight: 500; }
    .gg.light .sel-btn { background: #ffffff; }

    .sel-arrow {
      flex-shrink: 0;
      color: var(--ink-3, #8a8a8a);
      transition: transform 0.22s ease, color 0.2s ease;
    }
    .sel-arrow.is-open { transform: rotate(180deg); color: #FFD700; }

    .sel-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0; right: 0;
      z-index: 70;
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.18));
      background: var(--menu-bg, #141414);
      box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.65);
      animation: dropdownFade 0.15s ease-out;
    }
    .gg.light .sel-menu {
      background: #ffffff;
      box-shadow: 0 16px 36px -14px rgba(10, 10, 10, 0.3);
    }
    .sel-menu.drop-up {
      top: auto;
      bottom: calc(100% + 6px);
      animation: dropdownFadeUp 0.15s ease-out;
    }

    /* Qidiruv maydoni */
    .sel-search {
      display: flex;
      align-items: center;
      gap: 9px;
      height: 40px;
      padding: 0 12px;
      margin-bottom: 6px;
      border-radius: 10px;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      transition: border-color 0.2s ease;
    }
    .sel-search:focus-within { border-color: rgba(255, 215, 0, 0.55); }

    .sel-search-ic { color: var(--ink-3, #8a8a8a); flex-shrink: 0; }
    .sel-search:focus-within .sel-search-ic { color: #FFD700; }

    .sel-search input,
    .sel-search input:focus,
    .sel-search input:focus-visible {
      flex: 1;
      min-width: 0;
      height: 100%;
      background: transparent !important;
      border: 0 !important;
      outline: 0 !important;
      outline-offset: 0 !important;
      box-shadow: none !important;
      -webkit-appearance: none;
      appearance: none;
      padding: 0;
      font-family: 'Poppins', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ink-1, #f5f5f5);
    }
    .sel-search input::placeholder {
      color: var(--ph, rgba(255, 255, 255, 0.32));
      font-weight: 500;
    }

    .sel-search-x {
      width: 20px; height: 20px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      color: var(--ink-3, #8a8a8a);
      background: var(--hover, rgba(255, 255, 255, 0.08));
      transition: color 0.15s ease, background 0.15s ease;
    }
    .sel-search-x:hover { color: #FFD700; background: rgba(255, 215, 0, 0.16); }

    .sel-list { max-height: 232px; overflow-y: auto; padding-right: 2px; }
    .sel-list::-webkit-scrollbar { width: 3px; }

    .sel-empty {
      padding: 18px 12px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-3, #8a8a8a);
    }

    .sel-opt {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border-radius: 9px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ink-2, #c9c9c9);
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .sel-opt:hover { background: var(--hover, rgba(255, 215, 0, 0.10)); }
    .sel-opt.is-active {
      background: rgba(255, 215, 0, 0.14);
      color: #FFD700;
    }
    .gg.light .sel-opt.is-active { color: #8a6100; }

    /* ---- DateTime picker ---- */
    .dtp { position: relative; }

    .dtp-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 80;
      border-radius: 12px;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.22));
      background: var(--menu-bg, #141414);
      box-shadow: 0 20px 48px -14px rgba(0, 0, 0, 0.7);
      animation: dropdownFade 0.15s ease-out;
      overflow: hidden;
    }
    .dtp-panel.drop-up {
      top: auto;
      bottom: calc(100% + 8px);
      animation: dropdownFadeUp 0.15s ease-out;
    }
    .dtp-panel.align-right {
      left: auto;
      right: 0;
    }
    .gg.light .dtp-panel {
      background: #ffffff;
      box-shadow: 0 20px 44px -16px rgba(10, 10, 10, 0.3);
    }

    .dtp-body { display: flex; align-items: stretch; }

    @media (max-width: 480px) {
      .dtp-panel { left: 0; right: 0; }
      .dtp-cal { width: auto; flex: 1; }
      .dtp-col { width: 46px; }
    }

    /* --- Kalendar --- */
    .dtp-cal { padding: 10px; width: 254px; }

    .dtp-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 8px;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--line, rgba(255, 215, 0, 0.12));
    }
    .dtp-month {
      font-weight: 700; font-size: 13px;
      color: var(--ink-1, #f5f5f5);
      text-transform: capitalize;
    }
    .dtp-navbtn {
      width: 24px; height: 24px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-3, #8a8a8a);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .dtp-navbtn:hover { background: var(--hover, rgba(255,215,0,0.12)); color: #FFD700; }

    .dtp-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
    .dtp-week span {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 0;
      color: var(--ink-3, #8a8a8a);
      text-transform: capitalize;
    }

    .dtp-day {
      height: 30px;
      margin: 1px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--ink-2, #c9c9c9);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .dtp-day:hover:not(:disabled) { background: var(--hover, rgba(255,215,0,0.14)); }
    .dtp-day.is-out { color: var(--ink-3, #8a8a8a); opacity: 0.35; cursor: default; }
    .dtp-day.is-today {
      color: #FFD700;
      box-shadow: inset 0 0 0 1px rgba(255, 215, 0, 0.55);
    }
    .dtp-day.is-sel {
      background: linear-gradient(135deg, #FFD700, #F0B800);
      color: #17130a;
      font-weight: 800;
    }
    .gg.light .dtp-day.is-today { color: #8a6100; box-shadow: inset 0 0 0 1px rgba(201, 151, 0, 0.6); }

    /* --- Vaqt ustunlari --- */
    .dtp-times { display: flex; }
    .dtp-col {
      width: 54px;
      max-height: 268px;
      overflow-y: auto;
      padding: 4px;
      border-left: 1px solid var(--line, rgba(255, 215, 0, 0.12));
      display: flex;
      flex-direction: column;
      gap: 2px;
      scrollbar-width: thin;
    }
    .dtp-tick {
      padding: 6px 0;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ink-2, #c9c9c9);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .dtp-tick:hover { background: var(--hover, rgba(255,215,0,0.14)); }
    .dtp-tick.is-sel {
      background: rgba(255, 215, 0, 0.18);
      color: #FFD700;
    }
    .gg.light .dtp-tick.is-sel { background: rgba(255, 193, 7, 0.22); color: #8a6100; }

    /* --- Pastki qator --- */
    .dtp-foot {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px;
      padding: 8px 10px;
      border-top: 1px solid var(--line, rgba(255, 215, 0, 0.14));
    }
    .dtp-now {
      font-size: 13px;
      font-weight: 700;
      color: #FFD700;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }
    .dtp-now:hover { background: var(--hover, rgba(255,215,0,0.12)); }
    .gg.light .dtp-now { color: #8a6100; }

    /* ---- Login xatosi ---- */
    .login-error {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 18px;
      padding: 11px 14px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.32);
      color: #f87171;
      font-size: 13.5px;
      font-weight: 600;
      animation: confirmIn 0.2s ease-out;
    }

    /* ---- Yuklanish aylanasi ---- */
    .spinner {
      width: 18px; height: 18px;
      border-radius: 50%;
      border: 2.5px solid rgba(0, 0, 0, 0.25);
      border-top-color: rgba(0, 0, 0, 0.75);
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ---- Toast xabarlari ---- */
    .toast-wrap {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10050;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: min(400px, calc(100vw - 40px));
    }

    .toast {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 13px 14px 15px;
      border-radius: 12px;
      overflow: hidden;
      pointer-events: auto;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
      box-shadow: 0 16px 40px -14px rgba(0, 0, 0, 0.65);
      animation: toastIn 0.32s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .gg.dark  .toast { background: #17171a; }
    .gg.light .toast { background: #ffffff; box-shadow: 0 16px 36px -16px rgba(10,10,10,0.28); }

    @keyframes toastIn {
      from { opacity: 0; transform: translateX(26px) scale(0.96); }
      to   { opacity: 1; transform: none; }
    }
    .toast.is-out { animation: toastOut 0.22s ease-in forwards; }
    @keyframes toastOut {
      to { opacity: 0; transform: translateX(26px) scale(0.96); }
    }

    .toast__ic {
      width: 30px; height: 30px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .toast.is-success .toast__ic { background: rgba(34, 197, 94, 0.16); color: #4ade80; }
    .toast.is-error   .toast__ic { background: rgba(239, 68, 68, 0.16); color: #f87171; }
    .toast.is-info    .toast__ic { background: rgba(255, 215, 0, 0.16); color: #FFD700; }
    .gg.light .toast.is-success .toast__ic { color: #15803d; }
    .gg.light .toast.is-error   .toast__ic { color: #b91c1c; }
    .gg.light .toast.is-info    .toast__ic { color: #8a6100; }

    .toast__text {
      flex: 1;
      min-width: 0;
      margin: 4px 0 0;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.45;
      color: var(--ink-1, #f5f5f5);
      word-break: break-word;
    }

    .toast__x {
      width: 22px; height: 22px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      margin-top: 4px;
      color: var(--ink-3, #8a8a8a);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .toast__x:hover { background: var(--hover, rgba(255,255,255,0.08)); color: var(--ink-1, #f5f5f5); }

    /* Vaqt tugashini ko'rsatuvchi chiziq */
    .toast__bar {
      position: absolute;
      left: 0; bottom: 0;
      height: 3px;
      width: 100%;
      transform-origin: left;
      animation: toastBar linear forwards;
    }
    .toast.is-success .toast__bar { background: #22c55e; }
    .toast.is-error   .toast__bar { background: #ef4444; }
    .toast.is-info    .toast__bar { background: #FFD700; }
    @keyframes toastBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }

    @media (max-width: 560px) {
      .toast-wrap {
        top: auto;
        bottom: 16px;
        left: 16px;
        right: 16px;
        max-width: none;
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translateY(20px) scale(0.97); }
        to   { opacity: 1; transform: none; }
      }
    }

    /* ---- Rasmni katta ko'rish ---- */
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
    .lightbox-img {
      position: relative;
      z-index: 2;
      max-width: min(560px, 90vw);
      max-height: 82vh;
      border-radius: 18px;
      object-fit: contain;
      border: 2px solid rgba(255, 215, 0, 0.35);
      box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.8);
      animation: confirmIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .lightbox-x {
      position: absolute;
      top: 24px; right: 24px;
      z-index: 3;
      width: 44px; height: 44px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      color: #ffffff;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .lightbox-x:hover { background: rgba(255, 215, 0, 0.25); color: #FFD700; }

    .avatar-zoom { cursor: zoom-in; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .avatar-zoom:hover {
      transform: scale(1.12);
      box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.6);
    }

    /* ---- Confirm ---- */
    .confirm-root {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .confirm-box {
      position: relative;
      z-index: 2;
      width: min(420px, 100%);
      padding: 30px 28px 26px;
      border-radius: 16px;
      border: 1px solid var(--brd, rgba(255, 215, 0, 0.16));
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 30px 70px -20px rgba(0, 0, 0, 0.6);
      animation: confirmIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .gg.dark .confirm-box  { background: #131313; }
    .gg.light .confirm-box { background: #ffffff; }

    @keyframes confirmIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .confirm-icon {
      width: 62px; height: 62px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(239, 68, 68, 0.12);
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.06);
      color: #ef4444;
    }

    .confirm-actions {
      display: flex;
      gap: 12px;
      width: 100%;
      margin-top: 26px;
    }

    .confirm-btn {
      flex: 1;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.22s ease,
                  background 0.22s ease, border-color 0.22s ease;
    }
    .confirm-btn:active { transform: scale(0.97); }

    .confirm-btn.is-cancel {
      background: transparent;
      border: 1.5px solid var(--brd, rgba(255, 215, 0, 0.2));
      color: var(--ink-2, #c9c9c9);
    }
    .confirm-btn.is-cancel:hover {
      background: var(--hover, rgba(255, 215, 0, 0.08));
      border-color: rgba(255, 215, 0, 0.45);
      color: var(--ink-1, #f5f5f5);
    }

    .confirm-btn.is-danger {
      background: linear-gradient(135deg, #f05252 0%, #dc2626 100%);
      color: #ffffff;
      border: none;
      box-shadow: 0 6px 18px -6px rgba(220, 38, 38, 0.7);
    }
    .confirm-btn.is-danger:hover {
      background: linear-gradient(135deg, #f56565 0%, #e02424 100%);
      box-shadow: 0 10px 26px -8px rgba(220, 38, 38, 0.85);
      transform: translateY(-1px);
    }
    .confirm-btn.is-danger:active { transform: translateY(0) scale(0.97); }

    /* ---- Drawer ---- */
    .drawer-root { position: fixed; inset: 0; z-index: 9999; }

    .drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 1;
      animation: backdropFade 0.2s ease-out;
    }
    @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }

    .drawer {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: min(520px, 100%);
      z-index: 2;
      display: flex;
      flex-direction: column;
      box-shadow: -24px 0 60px -20px rgba(0, 0, 0, 0.55);
      animation: drawerIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes drawerIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .drawer-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 24px;
      border-bottom: 1px solid var(--brd, rgba(255, 215, 0, 0.14));
      flex-shrink: 0;
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 24px;
    }
    .drawer-foot {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 18px 24px;
      border-top: 1px solid var(--brd, rgba(255, 215, 0, 0.14));
      flex-shrink: 0;
    }
    .drawer-close {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-3, #8a8a8a);
      transition: background 0.2s ease, color 0.2s ease;
    }
    .drawer-close:hover {
      background: var(--hover, rgba(255, 215, 0, 0.1));
      color: var(--ink-1, #f5f5f5);
    }

    .gg.dark .drawer  { background: #101010; }
    .gg.light .drawer { background: #ffffff; }

    /* Drawer ichidagi maydonlar */
    .drawer-field { display: block; }
    .drawer-field > label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--ink-2, #c9c9c9);
    }

    @keyframes dropdownFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dropdownFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .content-fade { animation: fadeInUp 0.8s ease-out; }
  `;

  // ====================================
  // LOGIN PAGE
  // ====================================
  if (!isLoggedIn) {
    return (
      <div className="grizzly-app h-screen flex overflow-hidden relative">
        <style>{`
          ${sharedStyles}
          .animated-bg {
            background: #070707;
            position: relative;
            overflow: hidden;
            isolation: isolate;
          }

          /* ---- 1. Aurora mesh fon ---- */
          .aurora {
            position: absolute;
            inset: -25%;
            background:
              radial-gradient(closest-side at 28% 28%, rgba(255, 215, 0, 0.28), transparent 70%),
              radial-gradient(closest-side at 72% 58%, rgba(255, 160, 0, 0.26), transparent 70%),
              radial-gradient(closest-side at 48% 88%, rgba(255, 193, 7, 0.22), transparent 70%);
            filter: blur(60px);
            animation: auroraDrift 20s ease-in-out infinite alternate;
            z-index: 0;
          }
          @keyframes auroraDrift {
            0%   { transform: translate3d(-4%, -3%, 0) scale(1); }
            50%  { transform: translate3d(4%, 4%, 0) scale(1.15); }
            100% { transform: translate3d(-2%, 2%, 0) scale(1.06); }
          }

          /* ---- 2. Perspektiv grid pol ---- */
          .grid-floor {
            position: absolute;
            left: -60%; right: -60%; bottom: -12%;
            height: 62%;
            background-image:
              linear-gradient(rgba(255, 215, 0, 0.18) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 215, 0, 0.18) 1px, transparent 1px);
            background-size: 64px 64px;
            transform: perspective(420px) rotateX(72deg);
            transform-origin: bottom center;
            animation: gridScroll 5s linear infinite;
            -webkit-mask-image: linear-gradient(to top, #000 5%, transparent 85%);
            mask-image: linear-gradient(to top, #000 5%, transparent 85%);
            z-index: 0;
          }
          @keyframes gridScroll { to { background-position: 0 64px, 0 0; } }

          /* ---- 3. Markaziy yadro va orbitalar ---- */
          .core {
            position: relative;
            width: min(400px, 42vh);
            height: min(400px, 42vh);
            flex-shrink: 0;
          }
          .ring {
            position: absolute;
            border-radius: 50%;
            border: 1px solid rgba(255, 215, 0, 0.28);
          }
          .ring-1 { inset: 0;     animation: spin 30s linear infinite; }
          .ring-2 { inset: 50px;  border-style: dashed; border-color: rgba(255, 215, 0, 0.38); animation: spin 22s linear infinite reverse; }
          .ring-3 { inset: 100px; border-color: rgba(255, 167, 38, 0.42); animation: spin 14s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }

          /* Orbitadagi fitnes elementlari */
          .orbit-item {
            position: absolute;
            top: 50%; left: 50%;
            width: 44px; height: 44px;
            margin: -22px 0 0 -22px;
          }
          .orbit-badge {
            width: 44px; height: 44px;
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(10, 10, 10, 0.88);
            border: 1px solid rgba(255, 215, 0, 0.45);
            color: #FFD700;
            box-shadow: 0 0 18px rgba(255, 215, 0, 0.28);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          }
          .orbit-badge.green {
            border-color: rgba(255, 167, 38, 0.55);
            color: #FFA726;
            box-shadow: 0 0 18px rgba(255, 167, 38, 0.28);
          }
          /* Ikonka tik turishi uchun teskari aylanish */
          .ring-1 .orbit-badge { animation: spin 30s linear infinite reverse; }
          .ring-2 .orbit-badge { animation: spin 22s linear infinite; }
          .ring-3 .orbit-badge { animation: spin 14s linear infinite reverse; }

          /* Nafas oluvchi yorug'lik */
          .core-glow {
            position: absolute;
            inset: 130px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.40), transparent 70%);
            animation: breathe 3.4s ease-in-out infinite;
          }
          @keyframes breathe {
            0%, 100% { transform: scale(1);    opacity: 0.65; }
            50%      { transform: scale(1.18); opacity: 1; }
          }

          /* Tarqaluvchi to'lqinlar */
          .pulse-ring {
            position: absolute;
            inset: 140px;
            border-radius: 50%;
            border: 2px solid rgba(255, 215, 0, 0.55);
            animation: pulseOut 3.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          }
          .pulse-ring:nth-of-type(2) { animation-delay: 1.2s; }
          .pulse-ring:nth-of-type(3) { animation-delay: 2.4s; }
          @keyframes pulseOut {
            0%   { transform: scale(0.55); opacity: 0.85; }
            100% { transform: scale(2.4);  opacity: 0; }
          }

          /* Markazdagi ayiq logotipi */
          .core-icon {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 0 26px rgba(255, 215, 0, 0.5));
            animation: bearLift 3.6s ease-in-out infinite;
            pointer-events: none;
          }
          @keyframes bearLift {
            0%, 100% { transform: translate(-50%, -48%) scale(0.97); }
            50%      { transform: translate(-50%, -55%) scale(1.03); }
          }

          /* ---- 4. Yurak urishi chizig'i ---- */
          .ecg {
            position: absolute;
            left: 0; right: 0; top: 42%;
            width: 100%; height: 80px;
            z-index: 0;
            opacity: 0.5;
          }
          .ecg path {
            fill: none;
            stroke: #FFD700;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 1400;
            stroke-dashoffset: 1400;
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
            animation: ecgDraw 3.6s linear infinite;
          }
          @keyframes ecgDraw {
            0%   { stroke-dashoffset: 1400; }
            70%  { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -1400; }
          }

          /* ---- 5. Ko'tarilayotgan zarrachalar ---- */
          .particle {
            position: absolute;
            bottom: -20px;
            border-radius: 50%;
            background: rgba(255, 215, 0, 0.8);
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
            animation: rise linear infinite;
            z-index: 0;
          }
          @keyframes rise {
            0%   { transform: translateY(0) translateX(0)     scale(0.6); opacity: 0; }
            10%  { opacity: 0.9; }
            90%  { opacity: 0.5; }
            100% { transform: translateY(-100vh) translateX(28px) scale(1.1); opacity: 0; }
          }

          /* ---- 6. Yorug'lik supurgisi ---- */
          .sweep {
            position: absolute;
            top: 0; bottom: 0;
            width: 40%;
            background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.07), transparent);
            animation: sweepMove 9s ease-in-out infinite;
            z-index: 0;
          }
          @keyframes sweepMove {
            0%   { transform: translateX(-120%) skewX(-14deg); }
            100% { transform: translateX(320%)  skewX(-14deg); }
          }

          @media (prefers-reduced-motion: reduce) {
            .aurora, .grid-floor, .ring, .core-glow, .pulse-ring,
            .core-icon, .ecg path, .particle, .sweep { animation: none !important; }
          }
          .security-feature {
            display: flex; align-items: center; gap: 12px; padding: 12px 14px;
            border-radius: 12px; border: 1px solid rgba(255, 215, 0, 0.22);
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            transition: transform 0.3s ease, border-color 0.3s ease;
          }
          .security-feature:hover {
            transform: translateY(-4px);
            border-color: rgba(255, 215, 0, 0.6);
          }
          .ecg { pointer-events: none; }
          .security-feature-icon {
            width: 48px; height: 48px; border-radius: 8px; border: 2px solid #FFD700;
            display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
          }
          .input-group input:focus { border-color: #FFD700; box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.1); }

          /* ---- O'ng panel: umumiy palitraga moslashtirilgan ---- */
          .login-right { position: relative; overflow: hidden; }
          .login-right::before {
            content: '';
            position: absolute;
            top: -20%; right: -20%;
            width: 70%; height: 70%;
            border-radius: 50%;
            pointer-events: none;
          }

          .login-right.dark {
            background: linear-gradient(160deg, #131313 0%, #0a0a0a 55%, #0e0e0e 100%);
          }
          .login-right.dark::before {
            background: radial-gradient(circle, rgba(255, 215, 0, 0.10), transparent 70%);
            filter: blur(50px);
          }
          .login-right.dark .field {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 215, 0, 0.18);
            color: #fff;
          }
          .login-right.dark .field::placeholder { color: rgba(255, 255, 255, 0.28); }
          .login-right.dark .info-box {
            background: rgba(255, 215, 0, 0.06);
            border-color: rgba(255, 215, 0, 0.20);
          }

          .login-right.light {
            background: #ffffff;
          }
          .login-right.light::before {
            background: none;
          }
          .login-right.light .field {
            background: #ffffff;
            border-color: rgba(10, 10, 10, 0.13);
            color: #0a0a0a;
          }
          .login-right.light .field::placeholder { color: #9c9c9c; }
          .login-right.light .info-box {
            background: rgba(255, 215, 0, 0.12);
            border-color: rgba(255, 193, 7, 0.55);
          }
          /* ---- Yuqoridagi boshqaruv tugmalari ---- */
          .ctl.dark {
            --surface: rgba(255, 255, 255, 0.06);
            --brd:     rgba(255, 215, 0, 0.22);
            --hover:   rgba(255, 215, 0, 0.12);
            --ink-2:   #e8e8e8;
            --menu-bg: #141414;
          }
          .ctl.light {
            --surface: rgba(255, 255, 255, 0.94);
            --brd:     rgba(10, 10, 10, 0.13);
            --hover:   rgba(255, 215, 0, 0.16);
            --ink-2:   #525252;
            --menu-bg: #ffffff;
          }

          .field {
            width: 100%;
            height: 48px;
            padding: 0 16px;
            border-radius: 10px;
            border-width: 2px;
            border-style: solid;
            font-weight: 600;
            outline: none;
            transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
          }
          .field:focus {
            border-color: #FFD700 !important;
            box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.12);
          }
          .info-box {
            border-width: 1px;
            border-style: solid;
            border-radius: 12px;
          }
        `}</style>

        {/* Top-right controls */}
        <div className={`ctl ${darkMode ? 'dark' : 'light'} absolute top-6 right-6 z-50 flex items-center gap-3`}>
          <ThemeSwitcher theme={theme} setTheme={setTheme} darkMode={darkMode} t={t} />
          <LanguageSwitcher lang={lang} setLang={setLang} darkMode={darkMode} />
        </div>

        {/* LEFT — animated panel */}
        <div className="animated-bg login-left hidden md:flex md:w-1/2 h-full relative flex-col p-10 z-10 overflow-hidden">
          {/* Fon qatlamlari */}
          <div className="aurora" />
          <div className="grid-floor" />

          <svg className="ecg" viewBox="0 0 600 80" preserveAspectRatio="none">
            <path d="M0,40 L110,40 L128,12 L146,68 L164,26 L182,40 L300,40 L318,12 L336,68 L354,26 L372,40 L600,40" />
          </svg>

          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${(i * 7.3 + 4) % 96}%`,
                width: `${3 + (i % 3) * 2}px`,
                height: `${3 + (i % 3) * 2}px`,
                animationDuration: `${9 + (i % 5) * 2.5}s`,
                animationDelay: `${i * 0.9}s`,
              }}
            />
          ))}

          <div className="sweep" />

          {/* ---- TEPA: brend ---- */}
          <div className="relative z-10 content-fade">
            <div className="flex items-center gap-4 mb-3">
              <BearLogo size={76} className="shrink-0" style={{ filter: 'drop-shadow(0 4px 18px rgba(255,215,0,0.35))' }} />
              <h1 className="grizzly-title text-5xl font-black gold leading-none tracking-tight">
                GRIZZLY GYM
              </h1>
            </div>
            <p className="text-lg font-semibold text-gray-300">{t.brandTagline}</p>
          </div>

          {/* ---- MARKAZ: animatsiya ---- */}
          <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-6">
            <div className="core">
              {/* Tashqi orbita — 4 ta element */}
              <div className="ring ring-1">
                {[Weight, HeartPulse, Flame, Trophy].map((Icon, i) => (
                  <span
                    key={i}
                    className="orbit-item"
                    style={{ transform: `rotate(${i * 90}deg) translateY(-200px) rotate(${-i * 90}deg)` }}
                  >
                    <span className="orbit-badge"><Icon size={20} /></span>
                  </span>
                ))}
              </div>

              {/* O'rta orbita — 3 ta element */}
              <div className="ring ring-2">
                {[Bike, Timer, Droplets].map((Icon, i) => (
                  <span
                    key={i}
                    className="orbit-item"
                    style={{ transform: `rotate(${i * 120}deg) translateY(-150px) rotate(${-i * 120}deg)` }}
                  >
                    <span className="orbit-badge green"><Icon size={18} /></span>
                  </span>
                ))}
              </div>

              {/* Ichki orbita — 2 ta element */}
              <div className="ring ring-3">
                {[Footprints, Zap].map((Icon, i) => (
                  <span
                    key={i}
                    className="orbit-item"
                    style={{ transform: `rotate(${i * 180 + 45}deg) translateY(-100px) rotate(${-(i * 180 + 45)}deg)` }}
                  >
                    <span className="orbit-badge"><Icon size={16} /></span>
                  </span>
                ))}
              </div>

              <div className="core-glow" />
              <div className="pulse-ring" />
              <div className="pulse-ring" />
              <div className="pulse-ring" />

              <BearLogo size={170} className="core-icon" />
            </div>
          </div>

          {/* ---- PAST: ixcham kartalar ---- */}
          <div className="relative z-10 grid grid-cols-2 gap-3 content-fade">
            {[
              { Icon: Lock, title: t.featSecure },
              { Icon: BarChart3, title: t.featStats },
              { Icon: Timer, title: t.featAuto },
              { Icon: Users, title: t.featMembers },
            ].map((f, i) => (
              <div className="security-feature" key={i}>
                <f.Icon size={18} className="gold flex-shrink-0" />
                <p className="font-semibold text-white text-sm leading-tight">{f.title}</p>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-6 text-gray-400 text-xs flex items-center gap-2">
            <MapPin size={14} />
            <span>Bulung'ur, Mingchinor | © 2026 Grizzly GYM</span>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className={`login-right ${darkMode ? 'dark' : 'light'} w-full md:w-1/2 h-full flex items-center justify-center p-8 overflow-y-auto`}>
          <div className="relative z-10 w-full max-w-sm content-fade">
            <div className="mb-12">
              <h2 className="grizzly-title text-4xl font-black mb-3 gold">
                {t.loginTitle}
              </h2>
              <p className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t.loginSubtitle}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className={`block text-sm font-bold mb-2.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.login} *
                </label>
                <input
                  type="text"
                  className="field"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="admin"
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.password} *
                </label>
                <input
                  type="password"
                  className="field"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <div className="login-error">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="gold-btn w-full h-12 rounded-lg font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg mt-8 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-default disabled:transform-none"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    {t.loadingText}
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    {t.signIn}
                  </>
                )}
              </button>
            </div>

            {/* Sinov loginlari faqat o'z kompyuterida ko'rinadi */}
            {isLocalRun && (
              <div className="info-box mt-8 p-4">
                <p className={`text-xs font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  <Lightbulb size={14} className="gold" />
                  {t.demoMode}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.demoHint}</p>
              </div>
            )}

            <p className={`text-xs flex items-center justify-center gap-1.5 mt-6 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              <ShieldCheck size={14} />
              {t.tlsNote}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====================================
  // DASHBOARD
  // ====================================
  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: Home },
    { id: 'members', label: t.navMembers, icon: Users, badge: members.length },
    { id: 'sales', label: t.navSales, icon: ShoppingCart },
    { id: 'debtors', label: t.navDebtors, icon: AlertTriangle, badge: debtorList.length || null },
    // Sozlamalar va sayt — faqat zal egasiga
    ...(isOwner
      ? [
          { id: 'settings', label: t.navSettings, icon: Settings },
          { id: 'site', label: t.navSite, icon: Globe },
        ]
      : []),
  ];

  const pageMeta = {
    dashboard: { Icon: LayoutDashboard, label: t.pageDashboard },
    members: { Icon: Users, label: t.pageMembers },
    sales: { Icon: ShoppingCart, label: t.pageSales },
    debtors: { Icon: AlertTriangle, label: t.pageDebtors },
    settings: { Icon: Settings, label: t.pageSettings },
    site: { Icon: Globe, label: t.pageSite },
  };
  const CurrentPageIcon = pageMeta[activeTab].Icon;

  return (
    <div className={`grizzly-app gg ${darkMode ? 'dark' : 'light'} app-bg h-screen flex overflow-hidden`}>
      <style>{`
        ${sharedStyles}

        /* ============ RANG PALITRASI ============ */
        .gg.dark {
          --bg:        linear-gradient(160deg, #0b0b0b 0%, #101010 50%, #080808 100%);
          --surface:   rgba(255, 255, 255, 0.035);
          --surface-2: rgba(255, 255, 255, 0.06);
          --brd:       rgba(255, 215, 0, 0.14);
          --hover:     rgba(255, 215, 0, 0.07);
          --line:      rgba(255, 215, 0, 0.10);
          --ink-1:     #f5f5f5;
          --ink-2:     #c9c9c9;
          --ink-3:     #8a8a8a;
          --ph:        rgba(255, 255, 255, 0.28);
        }
        .gg.light {
          --bg:        #fffef6;
          --surface:   #ffffff;
          --surface-2: rgba(255, 215, 0, 0.13);
          --brd:       rgba(10, 10, 10, 0.12);
          --hover:     rgba(255, 215, 0, 0.20);
          --line:      rgba(10, 10, 10, 0.09);
          --ink-1:     #0a0a0a;
          --ink-2:     #3d3d3d;
          --ink-3:     #6e6e6e;
          --ph:        #9c9c9c;
        }

        /* Nozik tekstura — yassi kulranglikni yo'qotadi */
        .gg.light .app-bg, .gg.light.app-bg {
          background-color: #fffef6;
          background-image:
            radial-gradient(900px 500px at 92% -12%, rgba(255, 215, 0, 0.14), transparent 62%);
          background-attachment: fixed;
        }
        .gg.dark .app-bg, .gg.dark.app-bg {
          background-image:
            repeating-linear-gradient(135deg, rgba(255,215,0,0.018) 0 1px, transparent 1px 14px),
            linear-gradient(160deg, #0b0b0b 0%, #101010 50%, #080808 100%);
        }

        /* Kartalar oq fonda ajralib tursin */
        .gg.light .surface {
          border: 1px solid rgba(10, 10, 10, 0.11);
          box-shadow:
            0 1px 2px rgba(10, 10, 10, 0.05),
            0 6px 16px -6px rgba(10, 10, 10, 0.09);
          backdrop-filter: none;
        }
        .gg.light .stat-card:hover {
          box-shadow:
            0 1px 1px rgba(0, 0, 0, 0.04),
            0 8px 20px rgba(0, 0, 0, 0.07),
            0 24px 44px -14px rgba(201, 151, 0, 0.22);
        }

        /* ---- Sidebar ---- */
        .gg .sidebar { background: var(--surface); }
        .gg.light .sidebar {
          background: #fffdf0;
          border-right: 2px solid #0b0b0b;
          box-shadow: none;
        }

        /* Header va sidebar sarlavhasi — barcha bo'limlarda bir xil balandlik */
        .gg .topbar,
        .gg .sidebar-head {
          height: 92px;
          flex-shrink: 0;
        }
        .gg .topbar {
          position: relative;
          display: flex;
          align-items: center;
        }
        .gg.dark .topbar  { background: #0b0b0b; }
        .gg.light .topbar { background: #fffef6; }

        .gg .topbar::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 2px;
          background: linear-gradient(90deg, #FFD700, rgba(255, 215, 0, 0) 60%);
        }
        .gg.light .topbar::after {
          background: linear-gradient(90deg, #FFC800, rgba(255, 200, 0, 0) 60%);
        }

        /* Statistika kartalarida chap chekka urg'usi */
        .stat-card { position: relative; overflow: hidden; }
        .stat-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #FFD700, rgba(255, 215, 0, 0.15));
        }
        .gg.light .stat-card::before {
          background: linear-gradient(180deg, #0b0b0b 0%, #0b0b0b 55%, #FFC800 55%, #FFC800 100%);
        }

        .gg .app-bg, .gg.app-bg { background: var(--bg); }

        .gg .surface {
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .gg .surface-alt { background: var(--surface-2); }
        .gg .surface-hover:hover { background: var(--hover); }

        .gg .brd { border-color: var(--brd); }
        .gg .divide-line > * + * { border-color: var(--line); }

        .gg .ink-1 { color: var(--ink-1); }
        .gg .ink-2 { color: var(--ink-2); }
        .gg .ink-3 { color: var(--ink-3); }
        .gg .ph::placeholder { color: var(--ph); }

        .gg .row-hover:hover { background: var(--hover); }
        .gg.light .row-hover:nth-child(even) { background: rgba(255, 215, 0, 0.06); }
        .gg.light .row-hover:hover { background: rgba(255, 215, 0, 0.20); }
        .gg .nav-hover:hover { background: var(--hover); }
        /* Sidebar sanoq belgisi */
        .nav-badge {
          flex-shrink: 0;
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
          background: rgba(255, 215, 0, 0.16);
          border: 1px solid rgba(255, 215, 0, 0.32);
          color: #FFD700;
          transition: background 0.22s ease, color 0.22s ease,
                      border-color 0.22s ease, transform 0.22s ease;
        }
        .nav-badge.is-active {
          background: rgba(0, 0, 0, 0.28);
          border-color: rgba(0, 0, 0, 0.18);
          color: #1a1400;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        .gg.light .nav-badge {
          background: rgba(196, 148, 0, 0.14);
          border-color: rgba(196, 148, 0, 0.3);
          color: #8a6100;
        }
        .gg.light .nav-badge.is-active {
          background: rgba(0, 0, 0, 0.16);
          border-color: rgba(0, 0, 0, 0.12);
          color: #1a1400;
        }

        /* Yig'ilgan sidebarda kichik nuqta */
        .nav-dot {
          position: absolute;
          top: -3px;
          right: -4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #FFD700;
          box-shadow: 0 0 0 2px var(--surface, #101010);
        }
        .nav-dot.is-active { background: #1a1400; }
        .gg.light .nav-dot { box-shadow: 0 0 0 2px #fffdf0; }

        .gg .nav-active {
          background: linear-gradient(135deg, #FFD700 0%, #F0B800 100%);
          color: #17130a;
          box-shadow: 0 4px 14px -4px rgba(255, 215, 0, 0.55);
        }

        .add-btn { width: 44px; height: 44px; }

        .gg .field-sm {
          min-height: 44px;
          background: var(--surface-2);
          border: 2px solid var(--brd);
          color: var(--ink-1);
          outline: none;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .gg .field-sm::placeholder { color: var(--ph); }
        .gg input[type="number"]::-webkit-outer-spin-button,
        .gg input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .gg input[type="number"] { -moz-appearance: textfield; }
        .gg .field-sm:focus {
          border-color: #FFD700;
          box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.12);
        }

        /* ---- Grafik ---- */
        .chart-wrap { position: relative; width: 100%; }
        .chart-svg { width: 100%; height: 260px; display: block; overflow: visible; }

        .chart-grid {
          stroke: var(--line, rgba(255, 215, 0, 0.10));
          stroke-width: 1;
          stroke-dasharray: 4 6;
        }
        .chart-ytick, .chart-xtick {
          fill: var(--ink-3, #8a8a8a);
          font-size: 11px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
        }

        .chart-line { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .chart-line.is-member { stroke: #FFD700; }
        .chart-line.is-sales  { stroke: #FF9800; }

        .chart-area { stroke: none; }
        .chart-area.is-member { fill: rgba(255, 215, 0, 0.14); }
        .chart-area.is-sales  { fill: rgba(255, 152, 0, 0.10); }

        .chart-guide {
          stroke: var(--brd, rgba(255, 215, 0, 0.4));
          stroke-width: 1;
          stroke-dasharray: 3 4;
        }
        .chart-dot { stroke: var(--menu-bg, #141414); stroke-width: 2; transition: opacity 0.15s ease; }
        .chart-dot.is-member { fill: #FFD700; }
        .chart-dot.is-sales  { fill: #FF9800; }
        .gg.light .chart-dot { stroke: #ffffff; }

        .chart-tip {
          position: absolute;
          top: 8px;
          min-width: 210px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.22));
          background: var(--menu-bg, #141414);
          box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.7);
          pointer-events: none;
          z-index: 5;
          animation: dropdownFade 0.12s ease-out;
        }
        .gg.light .chart-tip {
          background: #ffffff;
          box-shadow: 0 16px 36px -14px rgba(10, 10, 10, 0.3);
        }
        .chart-tip-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--ink-1, #f5f5f5);
          margin-bottom: 8px;
        }
        .chart-tip-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2, #c9c9c9);
          padding: 3px 0;
        }
        .chart-tip-row b { color: var(--ink-1, #f5f5f5); font-weight: 800; }
        .chart-tip-row.is-total {
          margin-top: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--line, rgba(255, 215, 0, 0.14));
        }
        .chart-tip-row.is-total b { color: #FFD700; }
        .gg.light .chart-tip-row.is-total b { color: #8a6100; }

        .chart-tip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .chart-tip-dot.is-member { background: #FFD700; }
        .chart-tip-dot.is-sales  { background: #FF9800; }

        .chart-legend {
          display: flex;
          align-items: center;
          gap: 18px;
          font-size: 13px;
          font-weight: 700;
        }

        /* Davr filtri qatori — header ostida, qat'iy */
        .gg .subbar {
          height: 68px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 24px;
          position: relative;
          z-index: 35;
        }
        .gg.dark .subbar  { background: #0e0e0e; }
        .gg.light .subbar { background: #fbfaf2; }

        /* Segmentli tanlagich */
        .seg {
          display: inline-flex;
          padding: 3px;
          gap: 2px;
          border-radius: 11px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.16));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
        }
        .seg-btn {
          height: 36px;
          padding: 0 16px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--ink-2, #c9c9c9);
          transition: background 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }
        .seg-btn:hover { background: var(--hover, rgba(255, 215, 0, 0.1)); }
        .seg-btn.is-active {
          background: linear-gradient(135deg, #FFD700, #F0B800);
          color: #17130a;
          box-shadow: 0 3px 10px -3px rgba(255, 215, 0, 0.55);
        }

        /* Boshqaruv: to'rtta karta */
        .stat-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }
        @media (max-width: 1400px) { .stat-grid-4 { gap: 16px; } }
        @media (max-width: 1180px) { .stat-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px)  { .stat-grid-4 { grid-template-columns: 1fr; gap: 12px; } }

        /* Ikki ustunli blok */
        .grid-2 {
          display: grid;
          grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
          gap: 20px;
        }
        @media (max-width: 1180px) { .grid-2 { grid-template-columns: 1fr; } }

        /* Uchta ko'rsatkich yonma-yon */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 980px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 620px) { .stat-grid { grid-template-columns: 1fr; gap: 12px; } }

        /* Gorizontal ko'rsatkich kartasi */
        .stat-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
        }
        @media (max-width: 480px) {
          .stat-row { padding: 14px; gap: 12px; }
          .stat-row .grizzly-title { font-size: 20px; }
        }
        .stat-row-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 215, 0, 0.13);
          color: #FFD700;
        }
        .gg.light .stat-row-icon { background: rgba(255, 193, 7, 0.16); color: #8a6100; }
        .stat-row-icon.is-warn { background: rgba(245, 158, 11, 0.16); color: #f59e0b; }

        /* Savat qatori */
        .cart-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.14));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
        }
        .qty-box {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px;
          border-radius: 8px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.18));
          flex-shrink: 0;
        }
        .qty-box button {
          width: 26px; height: 26px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-2, #c9c9c9);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .qty-box button:hover { background: var(--hover, rgba(255,215,0,0.14)); color: #FFD700; }
        .qty-box span {
          min-width: 26px;
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--ink-1, #f5f5f5);
        }

        /* Sotilgan mahsulot chipi */
        .sold-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px 8px 8px;
          border-radius: 999px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.18));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .sold-chip:hover {
          border-color: rgba(255, 215, 0, 0.45);
          background: var(--hover, rgba(255, 215, 0, 0.08));
        }
        .sold-qty {
          min-width: 28px; height: 28px;
          border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #FFD700, #F0B800);
          color: #17130a;
          font-size: 12.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .sold-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--ink-1, #f5f5f5);
          white-space: nowrap;
        }
        .sold-sum {
          font-size: 12.5px;
          font-weight: 800;
          color: #FFD700;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .gg.light .sold-sum { color: #8a6100; }

        /* Teng ikki ustun */
        .grid-eq2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 900px) { .grid-eq2 { grid-template-columns: 1fr; } }

        /* Narx qatori */
        .price-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 12px;
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.14));
        }
        @media (max-width: 560px) {
          .price-row { flex-wrap: wrap; row-gap: 8px; padding: 14px; }
          .price-row > span:last-child { width: 100%; text-align: right; }
        }
        .price-ic {
          width: 42px; height: 42px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 215, 0, 0.13);
          color: #FFD700;
        }
        .gg.light .price-ic { background: rgba(255, 193, 7, 0.16); color: #8a6100; }

        /* =====================================================
           MOSLASHUVCHAN DIZAYN
           Desktop ≥1280 · Laptop 1024–1279 · Planshet 768–1023 · Telefon <768
           ===================================================== */

        /* Qidiruv va filtr paneli */
        @media (max-width: 780px) {
          .gg .toolbar { flex-direction: column; align-items: stretch !important; gap: 10px; }
          .gg .toolbar > * { width: 100% !important; margin-left: 0 !important; max-width: none !important; }
          .gg .toolbar .sel { width: 100% !important; }
          .gg .toolbar .search-box { flex: none; }
          /* Excel tugmasi matnsiz qolmasin */
          .gg .toolbar button { justify-content: center; }
        }

        /* Segmentli tanlagich telefonda */
        @media (max-width: 520px) {
          .seg { width: 100%; }
          .seg-btn { flex: 1; padding: 0 8px; font-size: 12.5px; }
          .subbar { gap: 10px; }
          .subbar > div { width: 100%; }
        }

        .only-sm { display: none; }

        /* Hamburger — faqat kichik ekranlarda */
        .gg .burger {
          display: none;
          width: 42px; height: 42px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          color: var(--ink-1, #f5f5f5);
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .gg .burger:hover {
          background: var(--hover, rgba(255, 215, 0, 0.12));
          border-color: rgba(255, 215, 0, 0.45);
          color: #FFD700;
        }

        .gg .nav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 55;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* ---------- LAPTOP: kichikroq bo'shliqlar ---------- */
        @media (max-width: 1279px) {
          .gg .topbar h2 { font-size: 26px; }
          .gg main { padding: 18px !important; }
        }

        /* ---------- PLANSHET VA TELEFON: sidebar chetdan ---------- */
        @media (max-width: 1023px) {
          .gg .burger { display: flex; }

          .gg .sidebar {
            position: fixed;
            top: 0; bottom: 0; left: 0;
            width: 256px !important;
            z-index: 60;
            transform: translateX(-100%);
            transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
          }

          /* Ustidan chiqqani uchun fon to'liq zich bo'lishi shart */
          .gg.dark  .sidebar { background: #101010; }
          .gg.light .sidebar { background: #fffdf0; }
          .gg .sidebar.is-open { transform: translateX(0); }

          /* Mobil menyuda yorliqlar doim ko'rinadi */
          .gg .sidebar .nav-label,
          .gg .sidebar .brand-text { display: block !important; }

          /* Yig'ish tugmasi mobil menyuda keraksiz */
          .gg .sidebar .collapse-btn { display: none; }

          .gg .topbar, .gg .sidebar-head { height: 76px; }
          .gg .topbar h2 { font-size: 22px; gap: 10px; }
          .gg .topbar h2 svg { width: 22px; height: 22px; }
          .gg .page-date { display: none; }

          .gg .subbar { height: auto; padding: 12px 18px; flex-wrap: wrap; }
          .gg .subbar > span:first-child { display: none; }
        }

        /* ---------- TELEFON ---------- */
        @media (max-width: 767px) {
          .gg main { padding: 14px !important; }
          .gg .topbar { height: 64px; }
          .gg .topbar > div { padding-left: 12px !important; padding-right: 12px !important; gap: 8px !important; }
          .gg .topbar h2 { font-size: 18px; gap: 8px; }
          .gg .topbar h2 svg { width: 19px; height: 19px; }
          .gg .burger { width: 38px; height: 38px; }

          /* Header boshqaruvlari ixcham: faqat ikonka */
          .gg .topbar .hdr-ctl { gap: 6px !important; }
          .gg .topbar .ctl-btn {
            height: 38px !important;
            padding: 0 9px !important;
            gap: 6px !important;
            min-width: 0 !important;
          }
          .gg .topbar .hide-sm { display: none !important; }
          .gg .topbar .only-sm { display: inline-flex !important; }

          /* Kartalar va jadval ichki bo'shliqlari */
          .gg .surface.rounded-xl { border-radius: 12px; }
          .gg table th, .gg table td { padding-left: 12px !important; padding-right: 12px !important; }
          .gg table th { font-size: 11.5px; }

          /* Jadval osti — ikki qatorga */
          .gg .table-foot {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px;
            padding: 12px 14px !important;
          }

          /* Drawer to'liq ekran */
          .gg .drawer { width: 100% !important; max-width: 100% !important; }
          .drawer-body { padding: 18px !important; }

          /* Grafik pastroq */
          .chart-svg { height: 200px; }
          .chart-tip { min-width: 170px; padding: 10px 12px; }

          /* Tasdiqlash oynasi */
          .confirm-box { padding: 24px 20px 20px; }

          /* Sahifalash ixcham */
          .pg-info { min-width: 52px; font-size: 12.5px; }
        }

        /* ---------- JADVALLARDA USTUNLARNI YASHIRISH ---------- */
        /* Kichik ekranda eng muhim ustunlar qoladi */
        @media (max-width: 1100px) {
          /* A'zolar: "Amal qiladi" ustuni */
          .tbl-members th:nth-child(5), .tbl-members td:nth-child(5) { display: none; }
        }
        @media (max-width: 860px) {
          /* A'zolar: telefon */
          .tbl-members th:nth-child(2), .tbl-members td:nth-child(2) { display: none; }
          /* Qarzdorlar: telefon */
          .tbl-debtors th:nth-child(2), .tbl-debtors td:nth-child(2) { display: none; }
          /* Sotuvlar: soni */
          .tbl-sales th:nth-child(2), .tbl-sales td:nth-child(2) { display: none; }
        }
        @media (max-width: 640px) {
          /* Sotuvlar: xaridor */
          .tbl-sales th:nth-child(3), .tbl-sales td:nth-child(3) { display: none; }
          /* Adminlar: login */
          .tbl-admins th:nth-child(2), .tbl-admins td:nth-child(2) { display: none; }
        }

        /* ---------- LOGIN SAHIFASI ---------- */
        @media (max-width: 900px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; padding: 24px !important; }
        }
        @media (max-width: 480px) {
          .login-right { padding: 18px !important; }
          .login-right .grizzly-title { font-size: 26px !important; }
        }

        /* Demo rejim belgisi */
        .demo-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 800;
          white-space: nowrap;
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #f59e0b;
        }

        /* To'lov usuli tanlagich */
        .mpick { display: flex; gap: 8px; }
        .mpick-btn {
          flex: 1;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          border: 1.5px solid var(--brd, rgba(255, 215, 0, 0.2));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          color: var(--ink-2, #c9c9c9);
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .mpick-btn:hover { border-color: rgba(255, 215, 0, 0.5); color: var(--ink-1, #f5f5f5); }
        .mpick-btn.is-on {
          background: linear-gradient(135deg, #FFD700, #F0B800);
          border-color: transparent;
          color: #17130a;
        }

        /* To'lov usuli belgisi */
        .mtag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .mtag.is-cash {
          background: rgba(34, 197, 94, 0.14);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }
        .mtag.is-card {
          background: rgba(59, 130, 246, 0.14);
          border-color: rgba(59, 130, 246, 0.32);
          color: #60a5fa;
        }
        .gg.light .mtag.is-cash { color: #15803d; }
        .gg.light .mtag.is-card { color: #1d4ed8; }

        /* Sayt sozlamalari — yopishqoq saqlash paneli */
        .gg .site-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
        }

        /* Rasm kataklari */
        .shot-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 1100px) { .shot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px)  { .shot-grid { grid-template-columns: 1fr; } }

        .shot__box {
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.16));
          background: var(--surface-2, rgba(255, 255, 255, 0.04));
        }
        .shot__box { position: relative; }
        .shot__box img { width: 100%; height: 100%; object-fit: cover; }
        .shot__empty { color: var(--ink-3, #8a8a8a); opacity: 0.6; }

        /* Tartib raqami */
        .shot__no {
          position: absolute;
          top: 8px; left: 8px;
          min-width: 22px; height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          color: #FFD700;
          font-size: 11px;
          font-weight: 800;
        }

        /* Ko'chirish tugmalari */
        .shot__move {
          position: absolute;
          right: 8px; bottom: 8px;
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .shot:hover .shot__move { opacity: 1; }
        .shot__move button {
          width: 26px; height: 26px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0, 0, 0, 0.62);
          backdrop-filter: blur(4px);
          color: #f5f5f5;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .shot__move button:hover:not(:disabled) { background: rgba(255, 215, 0, 0.85); color: #17130a; }
        .shot__move button:disabled { opacity: 0.3; cursor: default; }

        /* Yangi katak qo'shish */
        .gg .shot-add {
          aspect-ratio: 1;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 2px dashed var(--brd, rgba(255, 215, 0, 0.28));
          background: transparent;
          color: var(--ink-3, #8a8a8a);
          font-size: 13px;
          font-weight: 700;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .gg .shot-add:hover {
          border-color: rgba(255, 215, 0, 0.6);
          color: #FFD700;
          background: rgba(255, 215, 0, 0.05);
        }

        /* Savol-javob tahriri */
        .faq-edit {
          padding: 14px;
          border-radius: 10px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.14));
          background: var(--surface-2, rgba(255, 255, 255, 0.04));
        }
        .faq-edit__no {
          width: 26px; height: 26px;
          border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 9px;
          background: rgba(255, 215, 0, 0.14);
          color: #FFD700;
          font-size: 12px;
          font-weight: 800;
        }
        .gg textarea.field-sm { min-height: 62px; line-height: 1.55; }

        /* Yangi qo'shilgan qator — bir necha soniya yoritiladi */
        .gg .is-fresh {
          animation: freshRow 2.6s ease-out;
        }
        @keyframes freshRow {
          0%   { background: rgba(255, 215, 0, 0.22); }
          70%  { background: rgba(255, 215, 0, 0.12); }
          100% { background: transparent; }
        }
        .gg .is-fresh > td:first-child {
          box-shadow: inset 3px 0 0 #FFD700;
        }

        /* Rol belgisi */
        .role-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          background: var(--surface-2, rgba(255, 255, 255, 0.06));
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
          color: var(--ink-2, #c9c9c9);
        }
        .role-chip.is-owner {
          background: rgba(255, 215, 0, 0.16);
          border-color: rgba(255, 215, 0, 0.4);
          color: #FFD700;
        }
        .gg.light .role-chip.is-owner { color: #8a6100; }

        /* Karta sarlavhasi — ikkala jadvalda bir xil */
        .gg .card-head {
          height: 68px;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }

        /* Jadval qatori — qat'iy balandlik */
        .gg .tbl-row { height: 52px; }
        @media (max-width: 767px) { .gg .tbl-row { height: 48px; } }
        .gg .tbl-row > td { vertical-align: middle; }

        /* Jadval sarlavhasi ham bir xil */
        .gg table thead tr { height: 47px; }
        .gg table thead th { vertical-align: middle; }

        /* Jadval osti bir xil balandlikda */
        .gg .table-foot { min-height: 56px; display: flex; align-items: center; }

        /* Umumiy qidiruv maydoni */
        .gg .search-box {
          flex: 1;
          min-width: 0;
          height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border-radius: 10px;
          border: 2px solid var(--brd, rgba(255, 215, 0, 0.18));
          background: var(--surface, rgba(255, 255, 255, 0.04));
          transition: border-color 0.2s ease;
        }
        .gg .search-box:focus-within { border-color: rgba(255, 215, 0, 0.55); }

        .gg .search-ic { color: var(--ink-3, #8a8a8a); flex-shrink: 0; }
        .gg .search-box:focus-within .search-ic { color: #FFD700; }

        .gg .search-box input,
        .gg .search-box input:focus,
        .gg .search-box input:focus-visible {
          flex: 1;
          min-width: 0;
          height: 100%;
          background: transparent !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          -webkit-appearance: none;
          appearance: none;
          padding: 0;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-1, #f5f5f5);
        }
        .gg .search-box input::placeholder {
          color: var(--ph, rgba(255, 255, 255, 0.32));
          font-weight: 500;
        }
        .gg .search-box input::-webkit-search-cancel-button { display: none; }

        /* Jadval sarlavhasidagi qidiruv */
        .sale-search {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 12px;
          min-width: 210px;
          border-radius: 10px;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.2));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          transition: border-color 0.2s ease;
        }
        .sale-search:focus-within { border-color: rgba(255, 215, 0, 0.55); }
        .sale-search input,
        .sale-search input:focus,
        .sale-search input:focus-visible {
          flex: 1;
          min-width: 0;
          height: 100%;
          background: transparent !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          -webkit-appearance: none;
          appearance: none;
          padding: 0;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-1, #f5f5f5);
        }
        .sale-search input::placeholder {
          color: var(--ph, rgba(255, 255, 255, 0.32));
          font-weight: 500;
        }

        /* Sahifalash */
        .pg-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--brd, rgba(255, 215, 0, 0.18));
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          color: var(--ink-2, #c9c9c9);
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .pg-btn:hover:not(:disabled) {
          background: var(--hover, rgba(255, 215, 0, 0.12));
          border-color: rgba(255, 215, 0, 0.45);
          color: #FFD700;
        }
        .pg-btn:disabled { opacity: 0.35; cursor: default; }

        .pg-info {
          min-width: 62px;
          text-align: center;
          font-size: 13.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: var(--ink-1, #f5f5f5);
        }

        /* Jadval osti ajratgichi */
        .foot-sep {
          width: 1px;
          height: 18px;
          background: var(--brd, rgba(255, 215, 0, 0.22));
        }

        /* To'lov jarayoni chizig'i */
        .paybar {
          height: 5px;
          border-radius: 999px;
          background: var(--surface-2, rgba(255, 255, 255, 0.08));
          overflow: hidden;
          margin-top: 6px;
          min-width: 90px;
        }
        .paybar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #F2BD00, #FFD700);
          transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .paybar-fill.is-full { background: linear-gradient(90deg, #16a34a, #22c55e); }
        .gg.light .paybar { background: rgba(10, 10, 10, 0.08); }

        /* To'lov tugmasi */
        .gg .btn-pay {
          background: rgba(34, 197, 94, 0.14);
          border: 1px solid rgba(34, 197, 94, 0.32);
          color: #4ade80;
        }
        .gg .btn-pay:hover { background: rgba(34, 197, 94, 0.24); }
        .gg.light .btn-pay {
          background: rgba(22, 163, 74, 0.10);
          border-color: rgba(22, 163, 74, 0.28);
          color: #15803d;
        }
        .gg.light .btn-pay:hover { background: rgba(22, 163, 74, 0.18); }

        /* Jadval amal tugmalari */
        .gg .btn-edit {
          background: rgba(255, 215, 0, 0.12);
          border: 1px solid rgba(255, 215, 0, 0.28);
          color: #FFD700;
        }
        .gg .btn-edit:hover { background: rgba(255, 215, 0, 0.22); }
        .gg.light .btn-edit {
          background: rgba(255, 193, 7, 0.14);
          border-color: rgba(201, 151, 0, 0.32);
          color: #8a6100;
        }
        .gg.light .btn-edit:hover { background: rgba(255, 193, 7, 0.26); }

        .gg .btn-del {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.30);
          color: #f87171;
        }
        .gg .btn-del:hover { background: rgba(239, 68, 68, 0.22); }
        .gg.light .btn-del {
          background: rgba(220, 38, 38, 0.09);
          border-color: rgba(220, 38, 38, 0.26);
          color: #b91c1c;
        }
        .gg.light .btn-del:hover { background: rgba(220, 38, 38, 0.16); }

        .gg .btn-muted {
          background: transparent;
          color: var(--ink-1);
          border: 1px solid var(--brd);
          transition: background 0.25s ease, border-color 0.25s ease;
        }
        .gg .btn-muted:hover { background: var(--hover); }


        /* ============ ANIMATSIYALAR ============ */
        .stat-card { transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(255, 215, 0, 0.12); }
        .member-row { transition: all 0.2s ease; }
      `}</style>

      {/* SIDEBAR */}
      {/* Mobil menyu ochiq bo'lganda fon */}
      {mobileNav && <div className="nav-backdrop" onClick={() => setMobileNav(false)} />}

      <div className={`sidebar ${sidebarOpen ? 'w-64' : 'w-20'} ${mobileNav ? 'is-open' : ''} shrink-0 transition-all duration-300 brd border-r flex flex-col h-full`}>
        <div className={`sidebar-head border-b brd flex flex-col justify-center overflow-hidden ${sidebarOpen ? 'px-6' : 'px-0'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <BearLogo size={48} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="grizzly-title text-lg font-black gold-fixed leading-none whitespace-nowrap">
                  GRIZZLY GYM
                </h1>
                <p className="text-[11px] font-semibold ink-3 mt-1">Management</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <BearLogo size={46} />
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileNav(false); }}
              className={`w-full h-12 flex items-center rounded-lg font-semibold transition overflow-hidden ${
                sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'
              } ${activeTab === item.id ? 'nav-active' : 'ink-2 nav-hover'}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="relative shrink-0 flex items-center">
                <item.icon size={20} />
                {!sidebarOpen && item.badge != null && (
                  <span className={`nav-dot ${activeTab === item.id ? 'is-active' : ''}`} />
                )}
              </span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge != null && (
                    <span className={`nav-badge ${activeTab === item.id ? 'is-active' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t brd space-y-2 overflow-x-hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`collapse-btn w-full h-12 flex items-center rounded-lg font-semibold transition overflow-hidden ink-2 nav-hover ${
              sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'
            }`}
            title={sidebarOpen ? t.collapse : t.expand}
          >
            {sidebarOpen
              ? <PanelLeftClose size={20} className="shrink-0" />
              : <PanelLeftOpen size={20} className="shrink-0" />}
            {sidebarOpen && <span className="truncate">{t.collapse}</span>}
          </button>

          <a
            href="https://t.me/developer_ES"
            className={`dev-link w-full h-10 flex items-center rounded-lg text-sm font-semibold transition overflow-hidden ${
              sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'
            }`}
            title="@developer_ES"
          >
            <Send size={18} className="shrink-0" />
            {sidebarOpen && <span className="truncate">@developer_ES</span>}
          </a>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        <header className="topbar surface brd border-b shrink-0 z-40">
          <div className="w-full flex items-center justify-between px-6 gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="burger"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0 flex-1 page-head">
              <h2 className="grizzly-title text-3xl font-black flex items-center gap-3 gold-fixed leading-none min-w-0">
                <CurrentPageIcon size={30} strokeWidth={2.5} className="shrink-0" />
                <span className="truncate">{pageMeta[activeTab].label}</span>
              </h2>
              <p className="page-date text-sm mt-1 ink-3 truncate">
                {t.today}: {fmtDate(new Date())}
              </p>
            </div>

            <div className="hdr-ctl flex items-center gap-3 shrink-0">
              <ThemeSwitcher theme={theme} setTheme={setTheme} darkMode={darkMode} t={t} />
              <LanguageSwitcher lang={lang} setLang={setLang} darkMode={darkMode} />
              <UserMenu t={t} admin={currentAdmin} darkMode={darkMode}
                onLogout={handleLogout} onEditProfile={openProfile}
                onInstall={installPrompt ? runInstall : null} />
            </div>
          </div>
        </header>

        {/* Davr filtri — header ostida, scroll qilmaydi */}
        {activeTab === 'dashboard' && (
          <div className="subbar brd border-b shrink-0">
            <span className="text-sm font-semibold ink-3 hidden md:block">{periodLabel}</span>

            <div className="flex items-center gap-3 ml-auto">
              <div className="w-[180px]">
                <DateTimePicker
                  value={`${periodDate}T00:00`}
                  onChange={(v) => setPeriodDate(String(v).split('T')[0])}
                  locale={locale}
                  t={t}
                  dateOnly
                />
              </div>

              <div className="seg">
                {[
                  { id: 'day', label: t.day },
                  { id: 'week', label: t.week },
                  { id: 'month', label: t.month },
                  { id: 'year', label: t.year },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`seg-btn ${period === p.id ? 'is-active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className={`flex-1 min-h-0 overflow-x-hidden p-6 ${['members', 'sales', 'debtors', 'settings'].includes(activeTab) ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
          {/* ---------- DASHBOARD ---------- */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="stat-grid-4">
                <div className="stat-card surface rounded-xl p-6 pl-7 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className={`text-sm font-semibold ink-3`}>{t.totalMembers}</p>
                      <p className="grizzly-title text-4xl font-black mt-2 gold">{stats.totalMembers}</p>
                    </div>
                    <Users size={32} className="gold" style={{ opacity: 0.3 }} />
                  </div>
                  <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
                    <TrendingUp size={14} />+2 {t.thisWeek}
                  </p>
                </div>

                <div className="stat-card surface rounded-xl p-6 pl-7 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className={`text-sm font-semibold ink-3`}>{t.activeMembers}</p>
                      <p className="grizzly-title text-4xl font-black mt-2 text-green-500">{stats.activeMembers}</p>
                    </div>
                    <CheckCircle size={32} className="text-green-500" style={{ opacity: 0.3 }} />
                  </div>
                  <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    {Math.round((stats.activeMembers / stats.totalMembers) * 100)}%
                  </p>
                </div>

                <div className="stat-card surface rounded-xl p-6 pl-7 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className={`text-sm font-semibold ink-3`}>{t.overdueMembers}</p>
                      <p className="grizzly-title text-4xl font-black mt-2 text-red-500">{stats.overdueMembers}</p>
                    </div>
                    <AlertTriangle size={32} className="text-red-500" style={{ opacity: 0.3 }} />
                  </div>
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-500">
                    <AlertTriangle size={14} />
                    {t.debtors}: {stats.debtors} · {t.totalDebt}: {stats.totalDebt.toLocaleString(locale)}
                  </p>
                </div>

                <div className="stat-card surface rounded-xl p-6 pl-7 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className={`text-sm font-semibold ink-3`}>{t.monthlyRevenue}</p>
                      <p className="grizzly-title text-2xl font-black mt-2 gold leading-tight break-all">
                        {stats.allRevenue.toLocaleString(locale)}
                        <span className="text-sm ink-3 font-bold"> UZS</span>
                      </p>
                    </div>
                    <DollarSign size={32} className="gold shrink-0" style={{ opacity: 0.3 }} />
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-semibold">
                    <span className="ink-3 flex items-center gap-1.5">
                      <Banknote size={12} className="text-green-500 shrink-0" />
                      {t.cashIncome}: {stats.cashIncome.toLocaleString(locale)}
                    </span>
                    <span className="ink-3 flex items-center gap-1.5">
                      <CreditCard size={12} className="text-blue-400 shrink-0" />
                      {t.cardIncome}: {stats.cardIncome.toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bugungi sotuv */}
              <div className="surface rounded-xl p-6 shadow-lg flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center bg-yellow-400/15">
                    <ShoppingCart size={22} className="gold" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold ink-3">
                      {t.incomeBy[period]} · {periodLabel}
                    </p>
                    <p className="grizzly-title text-2xl font-black gold">
                      {periodTotalIncome.toLocaleString(locale)} UZS
                    </p>
                    <p className="text-xs ink-3 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} className="gold" />
                        {periodMembershipIncome.toLocaleString(locale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingCart size={12} className="gold" />
                        {periodSalesIncome.toLocaleString(locale)}
                      </span>
                      {periodStats && (
                        <>
                          <span className="foot-sep" />
                          <span className="flex items-center gap-1">
                            <Banknote size={12} className="text-green-500" />
                            {periodStats.cash.toLocaleString(locale)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard size={12} className="text-blue-400" />
                            {periodStats.card.toLocaleString(locale)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('sales')}
                  className="btn-muted flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition"
                >
                  <Plus size={18} />{t.addSale}
                </button>
              </div>

              {/* CHART */}
              <div className="surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                  <h3 className="grizzly-title text-xl font-black flex items-center gap-2.5 ink-1">
                    <LineChart size={22} className="gold" />
                    {t.incomeBy[period]}
                  </h3>

                  <div className="chart-legend">
                    <span className="flex items-center gap-2 ink-2">
                      <span className="chart-tip-dot is-member" />
                      {t.membershipIncome}
                    </span>
                    <span className="flex items-center gap-2 ink-2">
                      <span className="chart-tip-dot is-sales" />
                      {t.salesIncome}
                    </span>
                  </div>
                </div>

                <PeriodChart buckets={chartBuckets} locale={locale} t={t} />
              </div>

              {/* RECENT */}
              <div className={`surface rounded-xl shadow-lg overflow-hidden`}>
                <div className="p-6 border-b brd">
                  <h3 className={`grizzly-title text-xl font-black flex items-center gap-2.5 ink-1`}>
                    <Users size={22} className="gold" />
                    {t.recentMembers}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="gold-btn font-bold">
                        <th className="px-6 py-4 text-left">{t.name}</th>
                        <th className="px-6 py-4 text-left">{t.paid}</th>
                        <th className="px-6 py-4 text-left">{t.debt}</th>
                        <th className="px-6 py-4 text-center">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-line`}>
                      {members.map((m) => (
                        <tr key={m.id} className={`member-row row-hover ${freshId === m.id ? 'is-fresh' : ''}`}>
                          <td className={`px-6 py-4 font-bold ink-1`}>
                            <div className="flex items-center gap-3">
                              <Avatar darkMode={darkMode} src={m.photo} onOpen={setLightbox} />
                              {m.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 min-w-[140px]">
                            <div className="font-bold gold whitespace-nowrap">
                              {totalPaid(m).toLocaleString(locale)}
                              <span className="ink-3 font-semibold"> / {totalDue(m).toLocaleString(locale)}</span>
                            </div>
                            <PayBar paid={totalPaid(m)} total={totalDue(m)} />
                          </td>
                          <td className="px-6 py-4 font-bold whitespace-nowrap">
                            {debtOf(m) > 0 ? (
                              <div>
                                <span className={debtMonths(m) > 1 ? 'text-red-500' : 'text-amber-500'}>
                                  {debtOf(m).toLocaleString(locale)}
                                </span>
                                <p className="text-xs ink-3 font-semibold">
                                  {debtMonths(m)} {t.debtMonths}
                                </p>
                              </div>
                            ) : balanceOf(m) < 0 ? (
                              <span className="text-green-500">
                                +{Math.abs(balanceOf(m)).toLocaleString(locale)}
                              </span>
                            ) : (
                              <span className="text-green-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={getStatus(m)} t={t} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------- MEMBERS ---------- */}
          {activeTab === 'members' && (
            <div className="h-full flex flex-col gap-5 min-h-0">
              <div className="toolbar flex gap-4 flex-wrap items-center shrink-0">
                <div className="search-box">
                  <Search size={19} className="search-ic" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="sel-search-x">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <Select
                  className="w-44"
                  value={filterType}
                  onChange={setFilterType}
                  options={[
                    { value: 'all', label: t.all },
                    { value: 'daily', label: t.daily },
                    { value: 'alternate', label: t.alternate },
                    { value: 'active', label: t.statusActive },
                    { value: 'partial', label: t.statusPartial },
                    { value: 'overdue', label: t.statusOverdue },
                  ]}
                />

                <button
                  onClick={exportMembersToExcel}
                  title={t.exportExcel}
                  className="h-11 px-4 rounded-lg border-2 font-semibold transition surface brd ink-2 surface-hover flex items-center gap-2"
                >
                  <FileSpreadsheet size={20} className="gold" />
                  <span className="hidden lg:inline">Excel</span>
                </button>

                <button
                  onClick={() => { setPayForm({ memberId: '', amount: '', at: nowLocal(), method: 'cash' }); setShowAddPayment(true); }}
                  className="btn-muted h-11 ml-auto flex items-center gap-2 px-5 rounded-lg font-bold transition"
                >
                  <Wallet size={20} />{t.addPayment}
                </button>

                <button
                  onClick={openNewMember}
                  className="gold-btn h-11 flex items-center gap-2 px-6 rounded-lg font-bold transition hover:scale-105 active:scale-95"
                >
                  <Plus size={20} />{t.addMember}
                </button>
              </div>

              <div className="surface rounded-xl shadow-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div ref={tableAreaRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                  <table className="w-full tbl-members">
                    <thead>
                      <tr className="gold-btn font-bold">
                        <th className="px-6 py-4 text-left">{t.name}</th>
                        <th className="px-6 py-4 text-left">{t.phone}</th>
                        <th className="px-6 py-4 text-left">{t.paid}</th>
                        <th className="px-6 py-4 text-left">{t.debt}</th>
                        <th className="px-6 py-4 text-left">{t.validUntil}</th>
                        <th className="px-6 py-4 text-center">{t.status}</th>
                        <th className="px-6 py-4 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-line`}>
                      {pagedMembers.map((m) => (
                        <tr key={m.id} className={`member-row row-hover ${freshId === m.id ? 'is-fresh' : ''}`}>
                          <td className={`px-6 py-4 font-bold ink-1`}>
                            <div className="flex items-center gap-3">
                              <Avatar darkMode={darkMode} src={m.photo} onOpen={setLightbox} />
                              {m.name}
                            </div>
                          </td>
                          <td className={`px-6 py-4 ink-2`}>{m.phone || '—'}</td>
                          <td className="px-6 py-4 min-w-[160px]">
                            <div className="font-bold gold whitespace-nowrap">
                              {totalPaid(m).toLocaleString(locale)}
                              <span className="ink-3 font-semibold"> / {totalDue(m).toLocaleString(locale)}</span>
                            </div>
                            <PayBar paid={totalPaid(m)} total={totalDue(m)} />
                            <p className="text-xs ink-3 mt-1 flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-semibold">{monthsElapsed(m)} {t.months}</span>
                              <span className="opacity-50">/</span>
                              <span className="inline-flex items-center gap-1">
                                {m.type === 'daily'
                                  ? <CalendarDays size={12} className="gold" />
                                  : <CalendarClock size={12} className="gold" />}
                                {m.type === 'daily' ? t.daily : t.alternate}
                              </span>
                            </p>
                          </td>
                          <td className="px-6 py-4 font-bold whitespace-nowrap">
                            {debtOf(m) > 0 ? (
                              <div>
                                <span className={debtMonths(m) > 1 ? 'text-red-500' : 'text-amber-500'}>
                                  {debtOf(m).toLocaleString(locale)}
                                </span>
                                <p className="text-xs ink-3 font-semibold">
                                  {debtMonths(m)} {t.debtMonths}
                                </p>
                              </div>
                            ) : balanceOf(m) < 0 ? (
                              <span className="text-green-500">
                                +{Math.abs(balanceOf(m)).toLocaleString(locale)}
                              </span>
                            ) : (
                              <span className="text-green-500">—</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 font-bold whitespace-nowrap ${
                            debtOf(m) > 0 ? 'text-amber-500' : 'ink-2'
                          }`}>
                            {fmtDate(paidUntil(m))}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={getStatus(m)} t={t} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => openPayment(m.id)} className="btn-pay p-2 rounded transition" title={t.addPayment}>
                                <Wallet size={18} />
                              </button>
                              <button onClick={() => openEditMember(m)} className="btn-edit p-2 rounded transition" title={t.editMember}>
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteMember(m)} className="btn-del p-2 rounded transition" title={t.deleted}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Jadval osti — xulosa */}
                <div className="table-foot brd border-t px-6 py-3 flex items-center justify-between flex-wrap gap-4 shrink-0">
                  <Pager
                    page={safePage}
                    totalPages={totalPages}
                    onPage={setPage}
                    from={(safePage - 1) * rowsPerPage + 1}
                    to={Math.min(safePage * rowsPerPage, filteredMembers.length)}
                    total={filteredMembers.length}
                    t={t}
                  />
                  <div className="flex items-center gap-5 text-sm font-semibold flex-wrap">
                    <span className="ink-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {t.statusActive}: {filteredMembers.filter((m) => getStatus(m) === 'active').length}
                    </span>
                    <span className="ink-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {t.statusPartial}: {filteredMembers.filter((m) => getStatus(m) === 'partial').length}
                    </span>
                    <span className="ink-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {t.statusOverdue}: {filteredMembers.filter((m) => getStatus(m) === 'overdue').length}
                    </span>

                    <span className="foot-sep" />

                    <span className="gold flex items-center gap-2 whitespace-nowrap">
                      <Wallet size={16} />
                      {t.paid}: {filteredMembers.reduce((sum, m) => sum + totalPaid(m), 0).toLocaleString(locale)}
                    </span>
                    <span className="text-amber-500 flex items-center gap-2 whitespace-nowrap">
                      <AlertTriangle size={16} />
                      {t.debt}: {filteredMembers.reduce((sum, m) => sum + debtOf(m), 0).toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------- SALES ---------- */}
          {activeTab === 'sales' && (
            <div className="h-full flex flex-col gap-5 min-h-0">
              {/* Kunlik ko'rsatkichlar — gorizontal */}
              <div className="stat-grid shrink-0">
                <div className="stat-row surface rounded-xl shadow-lg">
                  <span className="stat-row-icon"><Wallet size={20} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold ink-3">{t.todayIncome}</p>
                    <p className="grizzly-title text-2xl font-black gold leading-tight">
                      {stats.todayIncome.toLocaleString(locale)}
                      <span className="text-xs ink-3 font-bold"> UZS</span>
                    </p>
                  </div>
                </div>

                <div className="stat-row surface rounded-xl shadow-lg">
                  <span className="stat-row-icon"><Receipt size={20} /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold ink-3">{t.sold}</p>
                    <p className="grizzly-title text-2xl font-black ink-1 leading-tight">
                      {todaySales.reduce((sum, x) => sum + (x.items || []).reduce((a, it) => a + it.qty, 0), 0)}
                      <span className="text-xs ink-3 font-bold"> {t.pcs}</span>
                    </p>
                  </div>
                </div>

                <div className="stat-row surface rounded-xl shadow-lg">
                  <span className={`stat-row-icon ${stats.salesDebtTotal > 0 ? 'is-warn' : ''}`}>
                    <AlertTriangle size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold ink-3">{t.salesDebt}</p>
                    <p className={`grizzly-title text-2xl font-black leading-tight ${
                      stats.salesDebtTotal > 0 ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {stats.salesDebtTotal.toLocaleString(locale)}
                      <span className="text-xs ink-3 font-bold"> UZS</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bugun sotilgan mahsulotlar */}
              {todayByProduct.length > 0 && (
                <div className="surface rounded-xl p-5 shadow-lg shrink-0">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <h3 className="grizzly-title text-base font-black flex items-center gap-2 ink-1">
                      <Package size={18} className="gold" />
                      {t.soldToday}
                    </h3>
                    <span className="text-xs font-semibold ink-3">{fmtDate(new Date())}</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {todayByProduct.map((p) => (
                      <div key={p.name} className="sold-chip">
                        <span className="sold-qty">{p.qty}</span>
                        <span className="sold-name">{p.name}</span>
                        <span className="sold-sum">{p.total.toLocaleString(locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amallar */}
              <div className="toolbar flex gap-3 flex-wrap items-center justify-end shrink-0">
                <button
                  onClick={openNewProduct}
                  className="btn-muted h-11 flex items-center gap-2 px-6 rounded-lg font-bold transition"
                >
                  <Package size={20} />{t.addProduct}
                </button>
                <button
                  onClick={() => setShowAddSale(true)}
                  className="gold-btn h-11 flex items-center gap-2 px-6 rounded-lg font-bold transition hover:scale-105 active:scale-95"
                >
                  <Plus size={20} />{t.addSale}
                </button>
              </div>

              <div className="grid-2 flex-1 min-h-0">
                {/* Mahsulotlar */}
                <div className="surface rounded-xl shadow-lg overflow-hidden flex flex-col min-h-0">
                  <div className="card-head border-b brd shrink-0">
                    <h3 className="grizzly-title text-base font-black flex items-center gap-2.5 ink-1">
                      <Package size={20} className="gold" />
                      {t.products}
                    </h3>
                  </div>

                  <div ref={productsAreaRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="gold-btn font-bold">
                          <th className="px-4 py-3 text-left whitespace-nowrap">{t.productName}</th>
                          <th className="px-3 py-3 text-left whitespace-nowrap">{t.price}</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedProducts.map((p) => (
                          <tr key={p.id} className={`member-row row-hover tbl-row ${freshId === p.id ? 'is-fresh' : ''}`}>
                            <td className="px-4 py-0 font-bold ink-1">{p.name}</td>
                            <td className="px-3 py-0 font-bold gold whitespace-nowrap">{p.price.toLocaleString(locale)}</td>
                            <td className="px-3 py-0">
                              <div className="flex justify-center gap-1.5">
                                <button onClick={() => openEditProduct(p)} className="btn-edit p-1.5 rounded transition" title={t.editProduct}>
                                  <Edit2 size={15} />
                                </button>
                                <button onClick={() => deleteProduct(p)} className="btn-del p-1.5 rounded transition">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-foot brd border-t px-4 py-2.5 shrink-0">
                    <Pager
                      page={productSafePage}
                      totalPages={productTotalPages}
                      onPage={setProductPage}
                      from={(productSafePage - 1) * productRows + 1}
                      to={Math.min(productSafePage * productRows, products.length)}
                      total={products.length}
                      t={t}
                    />
                  </div>
                </div>

                {/* Sotuvlar tarixi */}
                <div className="surface rounded-xl shadow-lg overflow-hidden flex flex-col min-h-0">
                  <div className="card-head border-b brd shrink-0 justify-between gap-4">
                    <h3 className="grizzly-title text-base font-black flex items-center gap-2.5 ink-1">
                      <Receipt size={20} className="gold" />
                      {t.salesHistory}
                    </h3>

                    <div className="sale-search">
                      <Search size={16} className="sel-search-ic" />
                      <input
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        placeholder={t.searchBuyer}
                      />
                      {salesSearch && (
                        <button type="button" onClick={() => setSalesSearch('')} className="sel-search-x">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div ref={salesAreaRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                    {filteredSales.length === 0 ? (
                      <div className="p-10 text-center ink-3 font-semibold">{t.noSales}</div>
                    ) : (
                      <table className="w-full tbl-sales">
                        <thead>
                          <tr className="gold-btn font-bold">
                            <th className="px-5 py-3 text-left">{t.product}</th>
                            <th className="px-3 py-3 text-center">{t.qty}</th>
                            <th className="px-5 py-3 text-left">{t.buyer}</th>
                            <th className="px-5 py-3 text-left">{t.total}</th>
                            <th className="px-3 py-3 text-left">{t.payMethod}</th>
                            <th className="px-5 py-3 text-left">{t.debt}</th>
                            <th className="px-3 py-3 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {pagedSales.map((x) => (
                            <tr key={x.id} className={`member-row row-hover tbl-row ${freshId === x.id ? 'is-fresh' : ''}`}>
                              <td className="px-5 py-0 ink-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-sm truncate max-w-[210px]">
                                    {(x.items || []).map((it) => it.productName).join(', ')}
                                  </span>
                                  {(x.items || []).length > 1 && (
                                    <span className="nav-badge shrink-0">{x.items.length}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-0 text-center font-semibold ink-2">
                                {(x.items || []).reduce((a, it) => a + it.qty, 0)}
                              </td>
                              <td className="px-5 py-0 text-sm ink-2 whitespace-nowrap">{x.buyer || t.guest}</td>
                              <td className="px-5 py-0 whitespace-nowrap">
                                <span className="font-bold gold">{salePaid(x).toLocaleString(locale)}</span>
                                {saleDebt(x) > 0 && (
                                  <span className="ink-3 font-semibold text-xs"> / {x.total.toLocaleString(locale)}</span>
                                )}
                              </td>
                              <td className="px-3 py-0">
                                <MethodTag method={x.method} t={t} />
                              </td>
                              <td className="px-5 py-0 font-bold whitespace-nowrap">
                                {saleDebt(x) > 0
                                  ? <span className="text-amber-500">{saleDebt(x).toLocaleString(locale)}</span>
                                  : <span className="text-green-500">—</span>}
                              </td>
                              <td className="px-3 py-0 text-center">
                                {saleDebt(x) > 0 && (
                                  <button
                                    onClick={() => setSalePayForm({ saleId: x.id, amount: String(saleDebt(x)), method: 'cash' })}
                                    className="btn-pay p-1.5 rounded transition"
                                    title={t.payDebt}
                                  >
                                    <Wallet size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="table-foot brd border-t px-5 py-2.5 shrink-0 flex items-center justify-between flex-wrap gap-3">
                    <Pager
                      page={salesSafePage}
                      totalPages={salesTotalPages}
                      onPage={setSalesPage}
                      from={(salesSafePage - 1) * salesRows + 1}
                      to={Math.min(salesSafePage * salesRows, filteredSales.length)}
                      total={filteredSales.length}
                      t={t}
                    />
                    <span className="text-sm font-bold gold whitespace-nowrap">
                      {filteredSales.reduce((a, x) => a + salePaid(x), 0).toLocaleString(locale)} UZS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------- SAYT SOZLAMALARI ---------- */}
          {activeTab === 'site' && isOwner && (
            <div className="space-y-5 pb-6">
              {!site ? (
                <div className="surface rounded-xl p-10 text-center ink-3 font-semibold">
                  {t.loadingText}
                </div>
              ) : (
                <>
                  <div className="site-bar">
                    <p className="text-sm ink-2 font-semibold flex items-center gap-2">
                      <Lightbulb size={16} className="gold shrink-0" />
                      {t.siteHint}
                    </p>
                    <button
                      onClick={saveSite}
                      disabled={siteSaving}
                      className="gold-btn h-11 flex items-center gap-2 px-6 rounded-lg font-bold transition hover:scale-105 active:scale-95 disabled:opacity-60"
                    >
                      {siteSaving ? <span className="spinner" /> : <Check size={18} />}
                      {t.saveSite}
                    </button>
                  </div>

                  <div className="grid-eq2">
                    {/* Aloqa */}
                    <div className="surface rounded-xl p-6 shadow-lg">
                      <h3 className="grizzly-title text-lg font-black mb-5 flex items-center gap-2.5 ink-1">
                        <Send size={20} className="gold" />{t.siteContacts}
                      </h3>

                      <div className="space-y-4">
                        <div className="drawer-field">
                          <label>{t.brandName}</label>
                          <input value={site.brandName || ''} onChange={(e) => patchSite({ brandName: e.target.value })}
                            className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.taglineLabel}</label>
                          <input value={site.tagline || ''} onChange={(e) => patchSite({ tagline: e.target.value })}
                            className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.phone}</label>
                          <input value={site.phone} onChange={(e) => patchSite({ phone: e.target.value })}
                            className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.telegramLink}</label>
                          <input value={site.telegram} onChange={(e) => patchSite({ telegram: e.target.value })}
                            placeholder="https://t.me/..." className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.instagramLink}</label>
                          <input value={site.instagram} onChange={(e) => patchSite({ instagram: e.target.value })}
                            placeholder="https://instagram.com/..." className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.instagramName}</label>
                          <input value={site.instagramLabel} onChange={(e) => patchSite({ instagramLabel: e.target.value })}
                            placeholder="@nom" className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.addressLabel}</label>
                          <input value={site.address} onChange={(e) => patchSite({ address: e.target.value })}
                            className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                        <div className="drawer-field">
                          <label>{t.mapLinkLabel}</label>
                          <input value={site.mapLink} onChange={(e) => patchSite({ mapLink: e.target.value })}
                            placeholder="https://maps.google.com/..." className="field-sm w-full px-4 py-2.5 rounded-lg" />
                        </div>
                      </div>
                    </div>

                    {/* Ish vaqti va narxlar */}
                    <div className="space-y-5">
                      <div className="surface rounded-xl p-6 shadow-lg">
                        <h3 className="grizzly-title text-lg font-black mb-5 flex items-center gap-2.5 ink-1">
                          <CalendarClock size={20} className="gold" />{t.siteHours}
                        </h3>

                        <div className="space-y-2.5">
                          {site.hours.map((h, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input value={h.day} onChange={(e) => patchHours(i, { day: e.target.value })}
                                placeholder={t.dayLabel} className="field-sm flex-1 min-w-0 px-3 py-2.5 rounded-lg" />
                              <input value={h.time} onChange={(e) => patchHours(i, { time: e.target.value })}
                                placeholder={t.timeLabel} className="field-sm w-[150px] shrink-0 px-3 py-2.5 rounded-lg" />
                              <button onClick={() => removeHourRow(i)} className="btn-del p-2 rounded shrink-0">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button onClick={addHourRow} className="btn-muted mt-3 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                          <Plus size={15} />{t.addRow}
                        </button>
                      </div>

                      <div className="surface rounded-xl p-6 shadow-lg">
                        <h3 className="grizzly-title text-lg font-black mb-5 flex items-center gap-2.5 ink-1">
                          <Wallet size={20} className="gold" />{t.sitePrices}
                        </h3>

                        <div className="seg mb-4" style={{ width: '100%' }}>
                          <button
                            onClick={() => patchSite({ useSystemPrices: true })}
                            className={`seg-btn ${site.useSystemPrices ? 'is-active' : ''}`}
                            style={{ flex: 1 }}
                          >
                            {t.useSystemPrices}
                          </button>
                          <button
                            onClick={() => patchSite({ useSystemPrices: false })}
                            className={`seg-btn ${!site.useSystemPrices ? 'is-active' : ''}`}
                            style={{ flex: 1 }}
                          >
                            {t.customPrices}
                          </button>
                        </div>

                        {site.useSystemPrices ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg surface-alt text-sm">
                              <span className="ink-3 font-semibold">{t.daily}</span>
                              <b className="gold">{prices.daily.toLocaleString(locale)}</b>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg surface-alt text-sm">
                              <span className="ink-3 font-semibold">{t.alternate}</span>
                              <b className="gold">{prices.alternate.toLocaleString(locale)}</b>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="drawer-field">
                              <label>{t.daily}</label>
                              <input type="number" value={site.priceDaily ?? ''}
                                onChange={(e) => patchSite({ priceDaily: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder={String(prices.daily)} className="field-sm w-full px-4 py-2.5 rounded-lg" />
                            </div>
                            <div className="drawer-field">
                              <label>{t.alternate}</label>
                              <input type="number" value={site.priceAlternate ?? ''}
                                onChange={(e) => patchSite({ priceAlternate: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder={String(prices.alternate)} className="field-sm w-full px-4 py-2.5 rounded-lg" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rasmlar */}
                  <div className="surface rounded-xl p-6 shadow-lg">
                    <h3 className="grizzly-title text-lg font-black mb-5 flex items-center gap-2.5 ink-1">
                      <ImagePlus size={20} className="gold" />{t.siteGallery}
                    </h3>

                    <div className="shot-grid">
                      {site.gallery.map((g, i) => (
                        <div key={i} className="shot">
                          <div className="shot__box">
                            {g.src ? (
                              <img src={g.src} alt="" onClick={() => setLightbox(g.src)} className="avatar-zoom" />
                            ) : (
                              <span className="shot__empty"><ImagePlus size={24} /></span>
                            )}

                            <span className="shot__no">{i + 1}</span>

                            <div className="shot__move">
                              <button onClick={() => moveGallery(i, -1)} disabled={i === 0} title="←">
                                <ChevronLeft size={15} />
                              </button>
                              <button onClick={() => moveGallery(i, 1)} disabled={i === site.gallery.length - 1} title="→">
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>

                          <input
                            value={g.caption}
                            onChange={(e) => patchGallery(i, { caption: e.target.value })}
                            placeholder={t.caption}
                            className="field-sm w-full px-3 py-2 rounded-lg mt-2.5"
                          />

                          <div className="flex gap-2 mt-2">
                            <label className="photo-btn flex-1 justify-center">
                              <ImagePlus size={14} />
                              {g.src ? t.replaceImage : t.pickImage}
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => pickGalleryImage(i, e.target.files?.[0])} />
                            </label>
                            <button
                              onClick={() => removeGallerySlot(i)}
                              className="btn-del p-2 rounded shrink-0"
                              title={t.removeSlot}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {site.gallery.length < 24 && (
                        <button onClick={addGallerySlot} className="shot-add">
                          <Plus size={26} />
                          <span>{t.addImage}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs ink-3 mt-4 flex items-center gap-2">
                      <Lightbulb size={14} className="gold shrink-0" />
                      {t.imageHint}
                    </p>
                  </div>

                  {/* Savol-javob */}
                  <div className="surface rounded-xl p-6 shadow-lg">
                    <h3 className="grizzly-title text-lg font-black mb-5 flex items-center gap-2.5 ink-1">
                      <Lightbulb size={20} className="gold" />{t.siteFaq}
                    </h3>

                    <div className="space-y-3">
                      {(site.faq || []).map((f, i) => (
                        <div key={i} className="faq-edit">
                          <div className="flex gap-2 items-start">
                            <span className="faq-edit__no">{i + 1}</span>
                            <div className="flex-1 min-w-0 space-y-2">
                              <input
                                value={f.q}
                                onChange={(e) => patchFaq(i, { q: e.target.value })}
                                placeholder={t.question}
                                className="field-sm w-full px-3 py-2.5 rounded-lg font-bold"
                              />
                              <textarea
                                value={f.a}
                                onChange={(e) => patchFaq(i, { a: e.target.value })}
                                placeholder={t.answer}
                                rows={2}
                                className="field-sm w-full px-3 py-2.5 rounded-lg resize-y"
                              />
                            </div>
                            <button onClick={() => removeFaqRow(i)} className="btn-del p-2 rounded shrink-0">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={addFaqRow} className="btn-muted mt-3 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                      <Plus size={15} />{t.addFaq}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---------- DEBTORS ---------- */}
          {activeTab === 'debtors' && (
            <div className="h-full flex flex-col gap-5 min-h-0">
              {/* Qidiruv */}
              <div className="shrink-0">
                <div className="search-box max-w-md">
                  <Search size={19} className="search-ic" />
                  <input
                    type="text"
                    placeholder={t.searchDebtor}
                    value={debtorSearch}
                    onChange={(e) => setDebtorSearch(e.target.value)}
                  />
                  {debtorSearch && (
                    <button type="button" onClick={() => setDebtorSearch('')} className="sel-search-x">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="surface rounded-xl shadow-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div ref={debtorsAreaRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                  {filteredDebtors.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                      <p className="text-lg font-bold ink-2">{t.noDebtors}</p>
                    </div>
                  ) : (
                    <table className="w-full tbl-debtors">
                      <thead>
                        <tr className="gold-btn font-bold">
                          <th className="px-6 py-4 text-left">{t.name}</th>
                          <th className="px-6 py-4 text-left">{t.phone}</th>
                          <th className="px-6 py-4 text-left">{t.membershipDebt}</th>
                          <th className="px-6 py-4 text-left">{t.saleDebtCol}</th>
                          <th className="px-6 py-4 text-left">{t.totalDebtCol}</th>
                          <th className="px-6 py-4 text-center">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedDebtors.map((r) => (
                          <tr key={r.id} className={`member-row row-hover ${freshId === r.id ? 'is-fresh' : ''}`}>
                            <td className="px-6 py-4 font-bold ink-1">
                              <div className="flex items-center gap-3">
                                <Avatar darkMode={darkMode} src={r.photo} onOpen={setLightbox} />
                                {r.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 ink-2">{r.phone || '—'}</td>
                            <td className="px-6 py-4 font-bold whitespace-nowrap">
                              {r.memberDebt > 0
                                ? <span className="text-amber-500">{r.memberDebt.toLocaleString(locale)}</span>
                                : <span className="ink-3">—</span>}
                            </td>
                            <td className="px-6 py-4 font-bold whitespace-nowrap">
                              {r.saleDebtSum > 0
                                ? <span className="text-amber-500">{r.saleDebtSum.toLocaleString(locale)}</span>
                                : <span className="ink-3">—</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="grizzly-title text-lg font-black text-red-500">
                                {r.total.toLocaleString(locale)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <button
                                  onClick={() => { setDebtorOpen(r); setDebtorPayAmount(String(r.memberDebt || '')); }}
                                  className="btn-pay flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition"
                                >
                                  <Wallet size={16} />
                                  {t.payDebt}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="table-foot brd border-t px-6 py-3 shrink-0 flex items-center justify-between flex-wrap gap-4">
                  <Pager
                    page={debtorSafePage}
                    totalPages={debtorTotalPages}
                    onPage={setDebtorPage}
                    from={(debtorSafePage - 1) * debtorRows + 1}
                    to={Math.min(debtorSafePage * debtorRows, filteredDebtors.length)}
                    total={filteredDebtors.length}
                    t={t}
                  />

                  <div className="flex items-center gap-5 text-sm font-semibold flex-wrap">
                    <span className="ink-2 flex items-center gap-2 whitespace-nowrap">
                      <CalendarDays size={16} className="gold" />
                      {t.membershipDebt}: {filteredDebtors.reduce((a, r) => a + r.memberDebt, 0).toLocaleString(locale)}
                    </span>
                    <span className="ink-2 flex items-center gap-2 whitespace-nowrap">
                      <ShoppingCart size={16} className="gold" />
                      {t.saleDebtCol}: {filteredDebtors.reduce((a, r) => a + r.saleDebtSum, 0).toLocaleString(locale)}
                    </span>
                    <span className="foot-sep" />
                    <span className="text-red-500 flex items-center gap-2 whitespace-nowrap">
                      <AlertTriangle size={16} />
                      {filteredDebtors.reduce((a, r) => a + r.total, 0).toLocaleString(locale)} UZS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------- SETTINGS ---------- */}
          {activeTab === 'settings' && isOwner && (
            <div className="h-full flex flex-col gap-5 min-h-0">
              {/* Narxlar */}
              <div className="surface rounded-xl p-6 shadow-lg shrink-0">
                <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                  <h3 className="grizzly-title text-xl font-black flex items-center gap-2.5 ink-1">
                    <Wallet size={22} className="gold" />
                    {t.settingsPricing}
                  </h3>
                  <button onClick={openPrices} className="btn-muted h-10 flex items-center gap-2 px-5 rounded-lg font-bold transition">
                    <Edit2 size={16} />{t.editPrices}
                  </button>
                </div>

                <div className="grid-eq2">
                  <div className="price-row">
                    <span className="price-ic"><CalendarDays size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold ink-3">{t.daily}</p>
                      <p className="font-bold ink-2 text-sm truncate">{t.pricingDaily}</p>
                    </div>
                    <span className="grizzly-title text-xl font-black gold whitespace-nowrap">
                      {prices.daily.toLocaleString(locale)}
                      <span className="text-xs ink-3 font-bold"> UZS / {t.perMonth}</span>
                    </span>
                  </div>

                  <div className="price-row">
                    <span className="price-ic"><CalendarClock size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold ink-3">{t.alternate}</p>
                      <p className="font-bold ink-2 text-sm truncate">{t.pricingAlternate}</p>
                    </div>
                    <span className="grizzly-title text-xl font-black gold whitespace-nowrap">
                      {prices.alternate.toLocaleString(locale)}
                      <span className="text-xs ink-3 font-bold"> UZS / {t.perMonth}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Adminlar */}
              <div className="surface rounded-xl shadow-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="card-head border-b brd justify-between gap-4">
                  <h3 className="grizzly-title text-base font-black flex items-center gap-2.5 ink-1">
                    <ShieldCheck size={20} className="gold" />
                    {t.admins}
                    <span className="nav-badge">{admins.length}</span>
                  </h3>
                  <button onClick={openNewAdmin} className="gold-btn h-10 flex items-center gap-2 px-5 rounded-lg font-bold transition hover:scale-105 active:scale-95">
                    <Plus size={18} />{t.addAdmin}
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full tbl-admins">
                    <thead>
                      <tr className="gold-btn font-bold">
                        <th className="px-6 py-3 text-left">{t.fullName}</th>
                        <th className="px-6 py-3 text-left">{t.login}</th>
                        <th className="px-6 py-3 text-left">{t.role}</th>
                        <th className="px-6 py-3 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {admins.map((a) => (
                        <tr key={a.id} className={`member-row row-hover tbl-row ${freshId === a.id ? 'is-fresh' : ''}`}>
                          <td className="px-6 py-0 font-bold ink-1">
                            <div className="flex items-center gap-3">
                              <Avatar darkMode={darkMode} src={a.photo} onOpen={setLightbox} />
                              {a.name}
                            </div>
                          </td>
                          <td className="px-6 py-0 ink-2 font-semibold">{a.login}</td>
                          <td className="px-6 py-0">
                            <span className={`role-chip ${a.role === 'owner' ? 'is-owner' : ''}`}>
                              {roleLabel[a.role] || a.role}
                            </span>
                          </td>
                          <td className="px-6 py-0">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => openEditAdmin(a)} className="btn-edit p-1.5 rounded transition" title={t.editAdmin}>
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => deleteAdmin(a)}
                                disabled={a.role === 'owner'}
                                className="btn-del p-1.5 rounded transition disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ---------- XABARLAR ---------- */}
      <Toasts items={toasts} onClose={dropToast} darkMode={darkMode} />

      {/* ---------- RASMNI KATTA KO'RISH ---------- */}
      {lightbox && (
        <div className={`grizzly-app gg ${darkMode ? 'dark' : 'light'} lightbox`} onClick={() => setLightbox(null)}>
          <div className="drawer-backdrop" />
          <img src={lightbox} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox-x" onClick={() => setLightbox(null)}>
            <X size={22} />
          </button>
        </div>
      )}


      {/* ---------- MENING HISOBIM ---------- */}
      <Drawer
        darkMode={darkMode}
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onSave={saveProfile}
        title={t.myProfile}
        subtitle={t.roleLabels?.[currentAdmin?.role] || ''}
        icon={UserRound}
        busy={loading}
        saveLabel={t.save}
        cancelLabel={t.cancel}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar darkMode={darkMode} src={profileForm.photo} size={64} onOpen={setLightbox} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="photo-btn">
                  <ImagePlus size={16} />
                  {t.uploadPhoto}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) { toast.err(t.imageHint); return; }
                      const reader = new FileReader();
                      reader.onload = () => setProfileForm({ ...profileForm, photo: reader.result });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {profileForm.photo && (
                  <button type="button" onClick={() => setProfileForm({ ...profileForm, photo: '' })}
                    className="btn-del px-3 py-2 rounded-lg text-xs font-bold transition">
                    {t.removePhoto}
                  </button>
                )}
              </div>
              <p className="text-xs ink-3 mt-2">{t.optional}</p>
            </div>
          </div>

          <div className="drawer-field">
            <label>{t.fullName} *</label>
            <input value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="drawer-field">
            <label>{t.login} *</label>
            <input value={profileForm.login}
              onChange={(e) => setProfileForm({ ...profileForm, login: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="p-4 rounded-lg surface-alt space-y-4">
            <p className="text-sm font-bold ink-2 flex items-center gap-2">
              <Lock size={16} className="gold" />{t.changePassword}
            </p>

            <div className="drawer-field">
              <label>{t.currentPassword}</label>
              <input type="password" placeholder="••••••••" value={profileForm.currentPassword}
                onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                className="field-sm w-full px-4 py-2.5 rounded-lg" />
            </div>

            <div className="drawer-field">
              <label>{t.newPassword}</label>
              <input type="password" placeholder="••••••••" value={profileForm.newPassword}
                onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                className="field-sm w-full px-4 py-2.5 rounded-lg" />
            </div>

            <p className="text-xs ink-3">{t.passwordOptional}</p>
          </div>
        </div>
      </Drawer>

      {/* ---------- ADMIN ---------- */}
      <Drawer
        darkMode={darkMode}
        open={showAdmin}
        onClose={() => { setShowAdmin(false); resetAdminForm(); }}
        onSave={handleSaveAdmin}
        title={adminForm.id ? t.editAdmin : t.addAdmin}
        subtitle={adminForm.id ? adminForm.name : t.admins}
        icon={adminForm.id ? Edit2 : ShieldCheck}
        busy={loading}
        saveLabel={t.save}
        cancelLabel={t.cancel}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar darkMode={darkMode} src={adminForm.photo} size={64} onOpen={setLightbox} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="photo-btn">
                  <ImagePlus size={16} />
                  {t.uploadPhoto}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setAdminForm({ ...adminForm, photo: reader.result });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {adminForm.photo && (
                  <button type="button" onClick={() => setAdminForm({ ...adminForm, photo: '' })}
                    className="btn-del px-3 py-2 rounded-lg text-xs font-bold transition">
                    {t.removePhoto}
                  </button>
                )}
              </div>
              <p className="text-xs ink-3 mt-2">{t.optional}</p>
            </div>
          </div>

          <div className="drawer-field">
            <label>{t.fullName} *</label>
            <input type="text" placeholder={t.fullName} value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="drawer-field">
            <label>{t.login} *</label>
            <input type="text" placeholder="admin" value={adminForm.login}
              onChange={(e) => setAdminForm({ ...adminForm, login: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="drawer-field">
            <label>{t.password}</label>
            <input type="password" placeholder="••••••••" value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="drawer-field">
            <label>{t.role} *</label>
            <Select
              value={adminForm.role}
              onChange={(v) => setAdminForm({ ...adminForm, role: v })}
              options={[
                { value: 'owner', label: t.roleOwner },
                { value: 'admin', label: t.roleAdmin },
                { value: 'cashier', label: t.roleCashier },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* ---------- NARXLAR ---------- */}
      <Drawer
        darkMode={darkMode}
        open={showPrices}
        onClose={() => setShowPrices(false)}
        onSave={savePrices}
        title={t.editPrices}
        subtitle={t.settingsPricing}
        icon={Wallet}
        busy={loading}
        saveLabel={t.save}
        cancelLabel={t.cancel}
      >
        <div className="space-y-5">
          <div className="drawer-field">
            <label>{t.priceDaily} *</label>
            <input type="number" value={priceForm.daily}
              onChange={(e) => setPriceForm({ ...priceForm, daily: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="drawer-field">
            <label>{t.priceAlternate} *</label>
            <input type="number" value={priceForm.alternate}
              onChange={(e) => setPriceForm({ ...priceForm, alternate: e.target.value })}
              className="field-sm w-full px-4 py-2.5 rounded-lg" />
          </div>

          <div className="p-4 rounded-lg surface-alt flex items-start gap-2.5">
            <Lightbulb size={16} className="gold shrink-0 mt-0.5" />
            <p className="text-xs ink-2 font-semibold">{t.priceNote}</p>
          </div>
        </div>
      </Drawer>

      {/* ---------- QARZDOR HISOBI ---------- */}
      <Drawer
        darkMode={darkMode}
        open={debtorOpen != null}
        onClose={() => setDebtorOpen(null)}
        onSave={async () => {
          if (!debtorOpen?.member) { setDebtorOpen(null); return; }
          const sum = Number(debtorPayAmount) || 0;
          if (sum <= 0) { setDebtorOpen(null); return; }
          try {
            await api.payments.create({ memberId: debtorOpen.member.id, amount: sum, paidAt: nowLocal(), method: debtorPayMethod });
            await reloadAfterPayment();
            toast.ok(t.paymentAdded);
          } catch (err) { handleApiError(err); }
          setDebtorOpen(null);
        }}
        title={t.debtorAccount}
        subtitle={debtorOpen?.name}
        icon={Wallet}
        busy={loading}
        saveLabel={t.save}
        cancelLabel={t.cancel}
      >
        {debtorOpen && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar darkMode={darkMode} src={debtorOpen.photo} size={52} onOpen={setLightbox} />
              <div className="min-w-0">
                <p className="font-black ink-1 truncate">{debtorOpen.name}</p>
                <p className="text-sm ink-3">{debtorOpen.phone || '—'}</p>
              </div>
              <span className="ml-auto grizzly-title text-xl font-black text-red-500 whitespace-nowrap">
                {debtorOpen.total.toLocaleString(locale)}
              </span>
            </div>

            {/* Oylik to'lov qarzi */}
            {debtorOpen.memberDebt > 0 && debtorOpen.member && (
              <div className="p-4 rounded-lg surface-alt space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="ink-2 flex items-center gap-2">
                    <CalendarDays size={16} className="gold" />
                    {t.membershipDebt}
                  </span>
                  <span className="text-amber-500">{debtorOpen.memberDebt.toLocaleString(locale)}</span>
                </div>

                <input
                  type="number"
                  placeholder="0"
                  value={debtorPayAmount}
                  onChange={(e) => setDebtorPayAmount(e.target.value)}
                  className="field-sm w-full px-4 py-2.5 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setDebtorPayAmount(String(debtorOpen.memberDebt))}
                  className="btn-muted px-4 py-2 rounded-lg text-xs font-bold transition"
                >
                  {t.payFull} — {debtorOpen.memberDebt.toLocaleString(locale)}
                </button>

                <MethodPick value={debtorPayMethod} onChange={setDebtorPayMethod} t={t} />
              </div>
            )}

            {/* Sotuv qarzlari */}
            {debtorOpen.saleDebtSum > 0 && (
              <div>
                <p className="text-sm font-bold ink-2 mb-2 flex items-center gap-2">
                  <ShoppingCart size={16} className="gold" />
                  {t.unpaidSales}
                </p>
                <div className="space-y-2">
                  {unpaidSalesOf(debtorOpen).map((x) => (
                    <div key={x.id} className="cart-row">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold ink-1 truncate">
                          {(x.items || []).map((it) => it.productName).join(', ')}
                        </p>
                        <p className="text-xs ink-3 font-semibold flex items-center gap-2">
                          {fmtDate(x.date)}
                          <MethodTag method={x.method} t={t} size={11} />
                        </p>
                      </div>
                      <span className="text-sm font-black text-amber-500 whitespace-nowrap">
                        {saleDebt(x).toLocaleString(locale)}
                      </span>
                      <button
                        type="button"
                        onClick={() => settleSale(x, saleDebt(x))}
                        className="btn-pay px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                      >
                        {t.settleAll}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ---------- TASDIQLASH ---------- */}
      <ConfirmDialog
        darkMode={darkMode}
        open={confirmState.open}
        onClose={closeConfirm}
        onConfirm={() => confirmState.onYes?.()}
        title={t.confirmTitle}
        text={t.confirmText}
        name={confirmState.name}
        yesLabel={t.yes}
        noLabel={t.no}
      />

      {/* ---------- DRAWERLAR (ildiz darajasida) ---------- */}

      <Drawer
        darkMode={darkMode}
        open={salePayForm.saleId != null}
        onClose={() => setSalePayForm({ saleId: null, amount: '', method: 'cash' })}
        onSave={() => {
          const x = sales.find((s2) => s2.id === salePayForm.saleId);
          if (x) settleSale(x, salePayForm.amount);
        }}
        title={t.settleSale}
        subtitle={t.payDebt}
        icon={Wallet}
        busy={loading}
        saveLabel={t.save}
        cancelLabel={t.cancel}
      >
        {(() => {
          const x = sales.find((s2) => s2.id === salePayForm.saleId);
          if (!x) return null;
          return (
            <div className="space-y-5">
              <div className="p-4 rounded-lg surface-alt space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold ink-3 uppercase tracking-wide">{t.product}</span>
                  {(x.items || []).map((it) => (
                    <div key={it.productId} className="flex items-center justify-between text-sm">
                      <span className="ink-1 font-semibold truncate">{it.productName} × {it.qty}</span>
                      <span className="ink-2 font-bold whitespace-nowrap ml-3">
                        {it.total.toLocaleString(locale)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="ink-3">{t.buyer}</span>
                  <span className="font-semibold ink-2">{x.buyer || t.guest}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="ink-3">{t.total}</span>
                  <span className="font-bold ink-1">{x.total.toLocaleString(locale)}</span>
                </div>
                <PayBar paid={salePaid(x)} total={x.total} />
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="ink-2">{t.remaining}</span>
                  <span className="text-amber-500">{saleDebt(x).toLocaleString(locale)} UZS</span>
                </div>
              </div>

              <div className="drawer-field">
                <label>{t.paymentAmount} *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={salePayForm.amount}
                  onChange={(e) => setSalePayForm({ ...salePayForm, amount: e.target.value })}
                  className="field-sm w-full px-4 py-2.5 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setSalePayForm({ ...salePayForm, amount: String(saleDebt(x)) })}
                  className="btn-muted mt-2 px-4 py-2 rounded-lg text-xs font-bold transition"
                >
                  {t.payFull} — {saleDebt(x).toLocaleString(locale)}
                </button>
              </div>

              <div className="drawer-field">
                <label>{t.payMethod}</label>
                <MethodPick
                  value={salePayForm.method}
                  onChange={(v) => setSalePayForm({ ...salePayForm, method: v })}
                  t={t}
                />
              </div>
            </div>
          );
        })()}
      </Drawer>

              <Drawer
                darkMode={darkMode}
                open={showAddPayment}
                onClose={() => setShowAddPayment(false)}
                onSave={handleAddPayment}
                title={t.addPayment}
                subtitle={t.paymentAmount}
                icon={Wallet}
                busy={loading}
                saveLabel={t.save}
                cancelLabel={t.cancel}
              >
                {(() => {
                  const sel = members.find((m) => m.id === Number(payForm.memberId));
                  const rest = sel ? debtOf(sel) : 0;
                  return (
                    <div className="space-y-5">
                      <div className="drawer-field">
                        <label>{t.member} *</label>
                        <Select
                          value={payForm.memberId}
                          onChange={(v) => setPayForm({ ...payForm, memberId: v })}
                          placeholder={t.member}
                          options={members.map((m) => ({
                            value: m.id,
                            label: `${m.name} — ${debtOf(m) > 0 ? `${t.debt}: ${debtOf(m).toLocaleString(locale)}` : t.statusActive}`,
                          }))}
                        />
                      </div>

                      {sel && (
                        <div className="p-4 rounded-lg surface-alt space-y-3">
                          <p className="text-xs font-bold ink-3 uppercase tracking-wide">{t.ledger}</p>

                          <div className="flex items-center justify-between text-sm">
                            <span className="ink-3">{t.startDate}</span>
                            <span className="font-semibold ink-2">
                              {fmtDate(sel.startDate)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="ink-3">{t.monthsDue}</span>
                            <span className="font-semibold ink-2">
                              {monthsElapsed(sel)} × {sel.amount.toLocaleString(locale)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="ink-3">{t.totalDue}</span>
                            <span className="ink-1">{totalDue(sel).toLocaleString(locale)}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="ink-3">{t.paid}</span>
                            <span className="gold">{totalPaid(sel).toLocaleString(locale)}</span>
                          </div>

                          <PayBar paid={totalPaid(sel)} total={totalDue(sel)} />

                          <div className="flex items-center justify-between text-sm font-bold pt-1">
                            <span className="ink-2">
                              {balanceOf(sel) < 0 ? t.prepaid : t.remaining}
                            </span>
                            <span className={
                              rest > 0
                                ? (debtMonths(sel) > 1 ? 'text-red-500' : 'text-amber-500')
                                : 'text-green-500'
                            }>
                              {Math.abs(balanceOf(sel)).toLocaleString(locale)} UZS
                              {rest > 0 && ` · ${debtMonths(sel)} ${t.debtMonths}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="ink-3">{t.validUntil}</span>
                            <span className="font-semibold ink-2">
                              {fmtDate(paidUntil(sel))}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="drawer-field">
                        <label>{t.paymentAmount} *</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={payForm.amount}
                          onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                          className="field-sm w-full px-4 py-2.5 rounded-lg"
                        />
                        {sel && rest > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayForm({ ...payForm, amount: String(rest) })}
                            className="btn-muted mt-2 px-4 py-2 rounded-lg text-xs font-bold transition"
                          >
                            {t.payFull} — {rest.toLocaleString(locale)}
                          </button>
                        )}
                      </div>

                      <div className="drawer-field">
                        <label>{t.paymentTime} *</label>
                        <DateTimePicker
                          value={payForm.at}
                          onChange={(v) => setPayForm({ ...payForm, at: v })}
                          locale={locale}
                          t={t}
                        />
                      </div>

                      <div className="drawer-field">
                        <label>{t.payMethod}</label>
                        <MethodPick
                          value={payForm.method}
                          onChange={(v) => setPayForm({ ...payForm, method: v })}
                          t={t}
                        />
                      </div>

                      {sel && (sel.payments || []).length > 0 && (
                        <div>
                          <p className="text-sm font-bold ink-2 mb-2">{t.paymentHistory}</p>
                          <div className="space-y-1.5">
                            {sel.payments.slice(0, 5).map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg surface-alt">
                                <span className="ink-3 flex-1 truncate">{fmtDateTime(p.at)}</span>
                                <MethodTag method={p.method} t={t} />
                                <span className="font-bold gold whitespace-nowrap">{p.amount.toLocaleString(locale)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Drawer>
              <Drawer
                darkMode={darkMode}
                open={showAddMember}
                onClose={() => { setShowAddMember(false); resetMemberForm(); }}
                onSave={handleAddMember}
                title={formData.id ? t.editMember : t.newMember}
                subtitle={formData.id ? formData.name : t.addMember}
                icon={formData.id ? Edit2 : UserPlus}
                busy={loading}
                saveLabel={t.save}
                cancelLabel={t.cancel}
              >
                <div className="space-y-5">
                  {/* Rasm — ixtiyoriy */}
                  <div className="flex items-center gap-4">
                    <Avatar darkMode={darkMode} src={formData.photo} size={64} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="photo-btn">
                          <ImagePlus size={16} />
                          {t.uploadPhoto}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setFormData({ ...formData, photo: reader.result });
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {formData.photo && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, photo: '' })}
                            className="btn-del px-3 py-2 rounded-lg text-xs font-bold transition"
                          >
                            {t.removePhoto}
                          </button>
                        )}
                      </div>
                      <p className="text-xs ink-3 mt-2">{t.photoHint} · {t.optional}</p>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <label>{t.name} *</label>
                    <input type="text" placeholder={t.name} value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="field-sm w-full px-4 py-2.5 rounded-lg" />
                  </div>

                  <div className="drawer-field">
                    <label>{t.phone}</label>
                    <input type="tel" placeholder="+998 90 123 45 67" value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="field-sm w-full px-4 py-2.5 rounded-lg" />
                  </div>

                  <div className="drawer-field">
                    <label>{t.type} *</label>
                    <Select
                      value={formData.type}
                      onChange={(v) => setFormData({ ...formData, type: v })}
                      options={[
                        { value: 'daily', label: `${t.daily} — ${prices.daily.toLocaleString(locale)} UZS` },
                        { value: 'alternate', label: `${t.alternate} — ${prices.alternate.toLocaleString(locale)} UZS` },
                      ]}
                    />
                  </div>

                  {!formData.id && (
                    <div className="drawer-field">
                      <label>{t.initialPayment}</label>
                      <input
                        type="number"
                        placeholder={`0 / ${prices[formData.type].toLocaleString(locale)}`}
                        value={formData.initialPaid}
                        onChange={(e) => setFormData({ ...formData, initialPaid: e.target.value })}
                        className="field-sm w-full px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs ink-3 mt-2">
                        {t.fullAmount}: {prices[formData.type].toLocaleString(locale)} UZS · {t.optional}
                      </p>
                    </div>
                  )}

                  {!formData.id && Number(formData.initialPaid) > 0 && (
                    <div className="drawer-field">
                      <label>{t.payMethod}</label>
                      <MethodPick
                        value={formData.method}
                        onChange={(v) => setFormData({ ...formData, method: v })}
                        t={t}
                      />
                    </div>
                  )}

                  <div className="drawer-field">
                    <label>{formData.id ? t.startDate : t.paymentTime} *</label>
                    <DateTimePicker
                      value={formData.paymentAt}
                      onChange={(v) => setFormData({ ...formData, paymentAt: v })}
                      locale={locale}
                      t={t}
                    />
                  </div>
                </div>
              </Drawer>
              <Drawer
                darkMode={darkMode}
                open={showAddSale}
                onClose={() => setShowAddSale(false)}
                onSave={handleAddSale}
                title={t.newSale}
                subtitle={t.addSale}
                icon={ShoppingCart}
                busy={loading}
                saveLabel={t.save}
                cancelLabel={t.cancel}
              >
                <div className="space-y-5">
                  {/* Xaridor — qidiruv bilan */}
                  <div className="drawer-field">
                    <label>{t.buyer}</label>
                    <Select
                      value={saleForm.buyer}
                      onChange={(v) => setSaleForm({ ...saleForm, buyer: v })}
                      searchable
                      searchPlaceholder={t.searchBuyer}
                      options={[
                        { value: '', label: t.guest },
                        ...members.map((m) => ({ value: m.name, label: m.name })),
                      ]}
                    />
                  </div>

                  {/* Mahsulot qo'shish */}
                  <div className="drawer-field">
                    <label>{t.product}</label>
                    <div className="flex gap-2 items-stretch">
                      <div className="flex-1 min-w-0">
                        <Select
                          value={itemDraft.productId}
                          onChange={(v) => setItemDraft({ ...itemDraft, productId: v })}
                          placeholder={t.product}
                          searchable
                          searchPlaceholder={t.searchProduct}
                          options={products.map((p) => ({
                            value: p.id,
                            label: `${p.name} — ${p.price.toLocaleString(locale)}`,
                          }))}
                        />
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={itemDraft.qty}
                        onChange={(e) => setItemDraft({ ...itemDraft, qty: e.target.value })}
                        className="field-sm w-[68px] px-2 rounded-lg text-center shrink-0"
                      />
                      <button
                        type="button"
                        onClick={addCartItem}
                        className="gold-btn add-btn rounded-lg flex items-center justify-center shrink-0"
                        title={t.addToCart}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Savat */}
                  <div>
                    <p className="text-sm font-bold ink-2 mb-2 flex items-center gap-2">
                      <ShoppingCart size={16} className="gold" />
                      {t.cart}
                      {saleForm.items.length > 0 && (
                        <span className="nav-badge">{saleForm.items.length}</span>
                      )}
                    </p>

                    {saleForm.items.length === 0 ? (
                      <p className="p-5 rounded-lg surface-alt text-center text-sm ink-3 font-semibold">
                        {t.emptyCart}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {saleForm.items.map((it) => (
                          <div key={it.productId} className="cart-row">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold ink-1 truncate">{it.productName}</p>
                              <p className="text-xs ink-3 font-semibold">
                                {it.unitPrice.toLocaleString(locale)} × {it.qty}
                              </p>
                            </div>

                            <div className="qty-box">
                              <button type="button" onClick={() => changeCartQty(it.productId, -1)}>
                                <Minus size={14} />
                              </button>
                              <span>{it.qty}</span>
                              <button type="button" onClick={() => changeCartQty(it.productId, 1)}>
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="text-sm font-black gold whitespace-nowrap w-24 text-right">
                              {it.total.toLocaleString(locale)}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeCartItem(it.productId)}
                              className="btn-del p-1.5 rounded shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jami va to'lov */}
                  {saleForm.items.length > 0 && (() => {
                    const paidNow = saleForm.paid === '' ? cartTotal : Math.max(0, Math.min(cartTotal, Number(saleForm.paid) || 0));
                    const debtNow = cartTotal - paidNow;
                    return (
                      <>
                        <div className="p-4 rounded-lg surface-alt flex items-center justify-between">
                          <span className="text-sm font-semibold ink-2">{t.total}</span>
                          <span className="grizzly-title text-2xl font-black gold">
                            {cartTotal.toLocaleString(locale)} UZS
                          </span>
                        </div>

                        <div className="drawer-field">
                          <label>{t.paidNow}</label>
                          <input
                            type="number"
                            placeholder={String(cartTotal)}
                            value={saleForm.paid}
                            onChange={(e) => setSaleForm({ ...saleForm, paid: e.target.value })}
                            className="field-sm w-full px-4 py-2.5 rounded-lg"
                          />
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <button type="button" onClick={() => setSaleForm({ ...saleForm, paid: String(cartTotal) })}
                              className="btn-muted px-3 py-1.5 rounded-lg text-xs font-bold transition">
                              {t.fullyPaidShort}
                            </button>
                            <button type="button" onClick={() => setSaleForm({ ...saleForm, paid: '0' })}
                              className="btn-muted px-3 py-1.5 rounded-lg text-xs font-bold transition">
                              {t.onCredit}
                            </button>
                          </div>
                          {debtNow > 0 && (
                            <p className="text-xs font-bold text-amber-500 mt-2 flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              {t.debt}: {debtNow.toLocaleString(locale)} UZS
                            </p>
                          )}
                        </div>

                        {paidNow > 0 && (
                          <div className="drawer-field">
                            <label>{t.payMethod}</label>
                            <MethodPick
                              value={saleForm.method}
                              onChange={(v) => setSaleForm({ ...saleForm, method: v })}
                              t={t}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Drawer>

              <Drawer
                darkMode={darkMode}
                open={showAddProduct}
                onClose={() => { setShowAddProduct(false); resetProductForm(); }}
                onSave={handleAddProduct}
                title={productForm.id ? t.editProduct : t.addProduct}
                subtitle={productForm.id ? productForm.name : t.products}
                icon={productForm.id ? Edit2 : Package}
                busy={loading}
                saveLabel={t.save}
                cancelLabel={t.cancel}
              >
                <div className="space-y-4">
                  <div className="drawer-field">
                    <label>{t.productName} *</label>
                    <input type="text" placeholder={t.productName} value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="field-sm w-full px-4 py-2.5 rounded-lg" />
                  </div>
                  <div className="drawer-field">
                    <label>{t.price} *</label>
                    <input type="number" placeholder="0" value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="field-sm w-full px-4 py-2.5 rounded-lg" />
                  </div>
                </div>
              </Drawer>
    </div>
  );
}
