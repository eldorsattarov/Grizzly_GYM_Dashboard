# Grizzly GYM — Boshqaruv tizimi

Fitnes zali uchun a'zolik, to'lov, sotuv va qarzdorlik boshqaruvi.

**Mustaqil loyiha.** Landing sahifa alohida (`grizzly-landing`) — u shu
serverga API orqali ulanadi, lekin o'z xostingida turadi.

**Talab:** Node.js 22.5+

---

## Ishga tushirish

**1-terminal — server:**
```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run seed
npm start
```

**2-terminal — boshqaruv:**
```bash
npm install
npm run dev
```

`http://localhost:5173` · Kirish: `admin` / `admin123`

### Qo'llanmalar

| Fayl | Nima uchun |
|------|-----------|
| [BUYRUQLAR_grizzlygym.md](./BUYRUQLAR_grizzlygym.md) | Sizning serveringiz uchun tayyor buyruqlar |
| [GIT_BILAN_ORNATISH.md](./GIT_BILAN_ORNATISH.md) | GitHub orqali o'rnatish va yangilash |
| [ISHLAB_CHIQARISH.md](./ISHLAB_CHIQARISH.md) | Xavfsizlik, parollar, zaxira nusxa |
| [VPS_ORNATISH.md](./VPS_ORNATISH.md) | Umumiy VPS qo'llanmasi |

---

## Ishlab chiqarishda

```bash
npm run build       # dist/ hosil bo'ladi
cd server && npm start
```

Server `dist/` ni topsa boshqaruv tizimini ham o'zi beradi —
`http://localhost:4000` da ochiladi. Alohida veb-server shart emas.

---

## Telefonga o'rnatish (PWA)

HTTPS da ishlaganda dastur telefon ekraniga ikonka sifatida o'rnatiladi.
Brauzer manzil qatori ko'rinmaydi — oddiy ilovadek ishlaydi.

**Android:** menyu → "Dastur sifatida o'rnatish"
**iPhone:** Safari → Ulashish → "Bosh ekranga qo'shish"
**Kompyuter:** manzil qatoridagi o'rnatish belgisi

> Servis-vorker API javoblarini **hech qachon keshlamaydi** — a'zolar, to'lovlar
> va qarzlar har doim serverdan olinadi.

---

## Bo'limlar

**Boshqaruv** — daromad grafigi, naqd/karta taqsimoti
**A'zolar** — kumulyativ qarz, qisman to'lov, Excel eksport
**Sotuv** — ko'p mahsulotli savat, qarzga berish
**Qarzdorlar** — a'zolik va sotuv qarzlari bir joyda
**Sozlamalar** \* — narxlar, adminlar
**Sayt sozlamalari** \* — landing mazmuni

\* faqat zal egasiga ko'rinadi

Har bir foydalanuvchi o'ng yuqoridagi menyudan o'z ismini, loginini,
rasmini va parolini o'zgartira oladi.

---

## Rollar

| | Egasi | Administrator | Kassir |
|---|:---:|:---:|:---:|
| A'zolar, to'lov, sotuv | ✓ | ✓ | ✓ |
| Mahsulotlar | ✓ | ✓ | — |
| Narxlar, adminlar, sayt | ✓ | — | — |
| O'z hisobi | ✓ | ✓ | ✓ |

---

## Asosiy qoida

**Daromadga faqat kelgan pul qo'shiladi.** Qarz to'langandagina hisobga kiradi.

```
Hisoblangan = o'tgan oylar × oylik narx
Qarz        = Hisoblangan − Jami to'langan
```

To'lov usuli (naqd / karta) faqat ma'lumot uchun — hisobga ta'sir qilmaydi.

---

## Landing sahifani ulash

Landing boshqa domenda tursa, serverdagi `.env` da ruxsat bering:

```
CORS_ORIGIN=https://grizzlygym.uz,https://admin.grizzlygym.uz
```

Landing tomonida esa server manzilini ko'rsating — batafsil landing
loyihasining README faylida.

---

## Zaxira nusxa

```bash
cd server && npm run backup
```
