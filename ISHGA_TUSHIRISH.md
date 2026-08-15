# Grizzly GYM — ishga tushirish qo'llanmasi

Tizim ikki qismdan iborat: **server** (backend) va **frontend**. Ikkalasi ham sizning kompyuteringizda ishlaydi.

---

## Talablar

- **Node.js 22.5 yoki yangiroq** — [nodejs.org](https://nodejs.org) dan yuklab oling
- Tekshirish: `node -v` buyrug'i versiyani ko'rsatishi kerak

> Ma'lumotlar bazasi uchun Node'ning **o'z ichiga qurilgan SQLite** moduli ishlatiladi.
> Hech qanday qo'shimcha kompilyator yoki Visual Studio Build Tools kerak emas.

---

## 1-qadam: Serverni ishga tushirish

```bash
cd server
npm install
```

`.env` faylini yarating (`.env.example` dan nusxa oling):

```bash
cp .env.example .env
```

Ichidagi qiymatlar:

```
PORT=4000
JWT_SECRET=bu-yerga-uzun-tasodifiy-matn-yozing
CORS_ORIGIN=http://localhost:5173
DB_FILE=./grizzly.db
```

> `JWT_SECRET` ni albatta o'zgartiring — u tokenlarni imzolaydi.

Bazani boshlang'ich ma'lumot bilan to'ldiring:

```bash
npm run seed
```

Serverni ishga tushiring:

```bash
npm start
```

Ekranda `Grizzly API → http://localhost:4000/api` chiqsa, server tayyor.

**Bu terminalni yopmang.** Frontend ishlagan vaqtda server ham ishlab turishi kerak.

---

## 2-qadam: Frontend'ni ishga tushirish

**Yangi terminal** oching (server ishlab turgan oynani yopmang):

```bash
npm install
npm run dev
```

Brauzerda `http://localhost:5173` manzilini oching.

---

## Kirish ma'lumotlari

| Login | Parol | Rol |
|-------|-------|-----|
| `admin` | `admin123` | Egasi — hamma narsaga ruxsat |
| `kassir` | `kassir123` | Kassir — admin boshqara olmaydi |

> Birinchi kirgandan keyin Sozlamalar bo'limidan parolni o'zgartiring.

---

## Rollar va ruxsatlar

| Amal | Egasi | Administrator | Kassir |
|------|:-----:|:-------------:|:------:|
| A'zolar, to'lovlar, sotuv | ✓ | ✓ | ✓ |
| Mahsulot va narxlar | ✓ | ✓ | — |
| Admin qo'shish | ✓ | ✓ | — |
| Admin o'chirish | ✓ | — | — |

Oxirgi egani o'chirib bo'lmaydi — aks holda tizimga kirish imkoni yo'qoladi.

---

## Ma'lumotlar bazasi

Barcha ma'lumot `server/grizzly.db` faylida saqlanadi (SQLite). Zaxira nusxa olish uchun shu faylni nusxalash kifoya:

```bash
cp server/grizzly.db zaxira-2026-08-11.db
```

Bazani noldan boshlash:

```bash
cd server
rm grizzly.db
npm run seed
```

---

## Boshqa kompyuterga o'rnatish

Agar server boshqa mashinada bo'lsa, frontend'ga uning manzilini ko'rsatish kerak. `index.html` ichida `<head>` qismiga qo'shing:

```html
<script>
  window.__GRIZZLY_API__ = 'http://192.168.1.50:4000/api';
</script>
```

Serverdagi `.env` faylida ham ruxsatni oching:

```
CORS_ORIGIN=http://192.168.1.100:5173
```

---

## Ishlab chiqarishga chiqarish

Frontend'ni yig'ish:

```bash
npm run build
```

`dist/` papkasi hosil bo'ladi — uni istalgan statik xostingga qo'yish mumkin.

Serverni doimiy ishlatish uchun `pm2` qulay:

```bash
npm install -g pm2
cd server
pm2 start src/index.js --name grizzly
pm2 startup && pm2 save
```

Endi server kompyuter qayta yoqilganda ham avtomatik ishga tushadi.

---

## Muammolarni hal qilish

**"Serverga ulanib bo'lmadi"**
Server ishlab turganini tekshiring: brauzerda `http://localhost:4000/api/health` ochilsa, `{"ok":true}` chiqishi kerak.

**"Login yoki parol noto'g'ri"**
`npm run seed` bajarilganini tekshiring. Baza bo'sh bo'lsa hech qanday admin yo'q.

**Port band**
`.env` da `PORT=4001` qilib o'zgartiring va frontend'da `window.__GRIZZLY_API__` ni yangilang.

**`Cannot find package 'dotenv'`**
`server` papkasi ichida `npm install` bajarilmagan. Ildiz papkadagi `npm install` server uchun ishlamaydi — ular alohida loyihalar:

```bash
cd server
npm install
```

**`gyp ERR!` yoki `MSBuild.exe failed`**
Bu native modul kompilyatsiyasi xatosi. Tizim endi Node'ning ichki SQLite'ini ishlatadi, shuning uchun bunday xato chiqmasligi kerak. Agar baribir chiqsa:

```bash
npm install --omit=optional
```

**Sahifa yangilanganda tizimdan chiqib ketyapti**
Token `localStorage` da saqlanadi. Brauzer "shaxsiy rejim" da bo'lsa yoki cookie'lar bloklangan bo'lsa shunday bo'ladi.

---

## Tizim tuzilishi

```
server/
├── src/
│   ├── index.js          Express ilova
│   ├── db.js             SQLite sxemasi
│   ├── logic.js          Qarz va holat hisobi
│   ├── auth.js           JWT va ruxsatlar
│   ├── seed.js           Boshlang'ich ma'lumot
│   └── routes/           API yo'llari
└── grizzly.db            Ma'lumotlar bazasi

GrizzlyGym_SoftData.jsx   Butun frontend
```

Muhim: **qarz hisobi serverda** bajariladi. Frontend faqat ko'rsatadi. Shuning uchun hisob-kitob har doim bir xil bo'ladi, qaysi qurilmadan kirishingizdan qat'i nazar.
