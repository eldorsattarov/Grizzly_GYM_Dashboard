# Ishlab chiqarishga chiqarish

Tizimni haqiqiy ishga qo'yishdan oldin shu ro'yxatni bosqichma-bosqich bajaring.

---

## 1. Maxfiy kalitni almashtirish

`server/.env` faylida `JWT_SECRET` — bu kirish tokenlarini imzolaydi.
Uni bilgan odam istalgan hisobga kira oladi.

`.env.example` da har safar yangi tasodifiy kalit turadi, lekin o'zingiznikini
yaratganingiz ma'qul:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Chiqqan matnni `.env` ga yozing.

> Server zaif kalit bilan **ishga tushmaydi** — bu ataylab qilingan.

---

## 2. Parollarni o'zgartirish

Boshlang'ich hisoblar hammaga ma'lum:

| Login | Parol |
|-------|-------|
| `admin` | `admin123` |
| `kassir` | `kassir123` |

Birinchi kirgandan keyin **Sozlamalar → Adminlar** bo'limidan har biriga yangi
parol qo'ying. Ishlatilmaydigan hisobni o'chiring.

---

## 3. Rollarni to'g'ri taqsimlash

| Rol | Nima qila oladi |
|-----|-----------------|
| **Egasi** | Hammasi — narxlar, adminlar, sayt sozlamalari |
| **Administrator** | A'zolar, to'lovlar, sotuv, mahsulotlar |
| **Kassir** | A'zolar, to'lovlar, sotuv |

Sozlamalar va Sayt sozlamalari bo'limlari **faqat egaga** ko'rinadi.

Kassirga ortiqcha huquq bermang — u kunlik ish uchun yetarli.

---

## 4. Boshqaruv tizimini yig'ish

```bash
npm run build
```

`dist/` papkasi hosil bo'ladi. Server uni topsa o'zi beradi — alohida
veb-server sozlash shart emas:

```bash
cd server
npm start
```

`http://localhost:4000` da boshqaruv tizimi ochiladi, `/api` da esa API.

---

## 5. Tarmoqdan kirishni sozlash

Boshqa qurilmalardan (telefon, planshet) kirish uchun kompyuteringiz
IP manzilini biling:

```bash
# Windows
ipconfig

# Linux / macOS
ip addr | grep "inet "
```

Keyin `server/.env` da:

```
CORS_ORIGIN=http://192.168.1.100:5173
```

Va frontend'ning `index.html` ida:

```html
<script>
  window.__GRIZZLY_API__ = 'http://192.168.1.100:4000/api';
</script>
```

> Windows brandmauerida 4000 va 5173 portlariga ruxsat berishingiz kerak bo'lishi mumkin.

---

## 6. Serverni doimiy ishlatish

Terminal yopilganda server ham to'xtaydi. `pm2` buni hal qiladi:

```bash
npm install -g pm2
cd server
pm2 start src/index.js --name grizzly
pm2 save
pm2 startup      # ko'rsatilgan buyruqni bajaring
```

Endi kompyuter qayta yoqilganda server o'zi ishga tushadi.

Foydali buyruqlar:

```bash
pm2 logs grizzly     # jurnalni ko'rish
pm2 restart grizzly  # qayta ishga tushirish
pm2 status           # holat
```

---

## 7. Zaxira nusxa

Barcha ma'lumot `server/grizzly.db` faylida. Uni yo'qotish — hamma narsani
yo'qotish degani.

```bash
cd server
npm run backup
```

`backups/` papkasiga sana bilan nusxa tushadi. Oxirgi 30 tasi saqlanadi.

**Avtomatlashtirish.** Linux'da har kuni soat 23:00 da:

```bash
crontab -e
# quyidagi qatorni qo'shing:
0 23 * * * cd /yo'l/server && /usr/bin/npm run backup
```

Windows'da Task Scheduler orqali xuddi shunday.

> Nusxalarni vaqti-vaqti bilan boshqa joyga ham ko'chiring — flesh xotira
> yoki bulut. Bir diskda turgan nusxa disk ishdan chiqsa yordam bermaydi.

---

## 8. Domen va HTTPS

Ikki loyiha **alohida** joylashadi. Odatiy taqsimot:

| Manzil | Nima | Qayerda |
|--------|------|---------|
| `grizzlygym.uz` | Landing sahifa | Statik xosting (Netlify, Vercel) |
| `admin.grizzlygym.uz` | Boshqaruv + API | Sizning serveringiz |

### Boshqaruv serveri uchun nginx

`/etc/nginx/sites-available/grizzly`:

```nginx
server {
    listen 80;
    server_name admin.grizzlygym.uz;

    client_max_body_size 8M;    # rasm yuklash uchun

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/grizzly /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d admin.grizzlygym.uz
```

### Ikkalasini bog'lash

Serverdagi `.env` da **ikkala domenni** ruxsat ro'yxatiga yozing:

```
CORS_ORIGIN=https://grizzlygym.uz,https://admin.grizzlygym.uz
```

Landing tomonida server manzilini ko'rsating — `dist/index.html` ichida:

```html
<script>
  window.__GRIZZLY_API__ = 'https://admin.grizzlygym.uz/api';
</script>
```

> Bu usul qulay: saytni qayta yig'masdan manzilni almashtirish mumkin.
> Yoki landing loyihasida `.env` da `VITE_API_URL` yozib, `npm run build` qiling.

### Landing sahifani joylashtirish

```bash
cd grizzly-landing
npm run build
```

`dist/` ni xostingga tashlang. Netlify va Vercel'da papkani sudrab tashlash
kifoya — yoki git bilan bog'lasangiz har push'da avtomatik yangilanadi.

Landing mazmuni **Sayt sozlamalari** bo'limidan boshqariladi — telefon,
ish vaqti, rasmlar, narxlar, savol-javob. Qayta yig'ish shart emas.

Server ulanmasa sayt buzilmaydi — `src/data.js` dagi qiymatlar bilan ishlaydi.

---

## Tez tekshirish

Ishga tushirgandan keyin:

- [ ] `http://localhost:4000/api/health` → `{"ok":true}` qaytaradi
- [ ] Yangi parol bilan kirish ishlaydi
- [ ] `admin123` va `kassir123` endi **ishlamaydi**
- [ ] Kassir bilan kirganda Sozlamalar bo'limi ko'rinmaydi
- [ ] A'zo qo'shib ko'ring, keyin to'lov qabul qiling — qarz to'g'ri hisoblanadimi
- [ ] `npm run backup` nusxa yaratadi
- [ ] Telefondan kirib ko'ring
- [ ] Landing ochiladi va serverdan ma'lumot oladi (telefon to'g'ri ko'rinadimi)

---

## Muammo chiqsa

**Server ishga tushmayapti**
Xabarni o'qing — u odatda sababni aniq aytadi. Ko'p uchraydigani: `JWT_SECRET`
qisqa yoki `.env` fayli yo'q.

**"Serverga ulanib bo'lmadi"**
Server ishlab turganini tekshiring. Boshqa qurilmadan kirsangiz `CORS_ORIGIN`
va `window.__GRIZZLY_API__` to'g'ri sozlanganini tekshiring.

**"Juda ko'p urinish"**
Login 15 daqiqada 20 martadan ko'p noto'g'ri kiritilgan. Kutib turing yoki
serverni qayta ishga tushiring.

**Ma'lumot yo'qoldi**
`backups/` dan oxirgi nusxani `grizzly.db` nomi bilan tiklang:

```bash
cd server
cp backups/grizzly-2026-08-14_23-00.db grizzly.db
pm2 restart grizzly
```
