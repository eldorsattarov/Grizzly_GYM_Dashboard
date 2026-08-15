# Grizzly GYM — sizning serveringiz uchun buyruqlar

**Server IP:** `189.74.96.248`
**Domen:** `grizzlygym.uz`
**Tarif:** VPS 1 (1 GB RAM, 20 GB NVMe, Ubuntu 24.04)

Natijada:

| Manzil | Nima |
|--------|------|
| `https://grizzlygym.uz` | Landing sahifa — mijozlar uchun |
| `https://admin.grizzlygym.uz` | Boshqaruv tizimi — siz uchun |

Buyruqlarni tartib bilan bajaring. Har birini nusxalab terminalga qo'ying.

---

## 0-qadam: root parolni toping

Eskiz boshqaruv panelida **Parametrlar** tugmasini bosing yoki elektron pochtangizni
tekshiring — VPS yaratilganda parol yuboriladi.

Topolmasangiz panelda parolni qayta o'rnatish imkoni bor.

> **Eslatma:** panelda ko'rsatilgan IP `189.74.96.248`. Agar u boshqacha bo'lsa,
> quyidagi buyruqlarda IP ni o'zingiznikiga almashtiring.

---

## 1-qadam: DNS sozlash

Domen boshqaruv panelida (Eskiz → Domenlar → `grizzlygym.uz` → DNS) uchta yozuv qo'shing:

| Turi | Nomi | Qiymati | TTL |
|------|------|---------|-----|
| A | `@` | `189.74.96.248` | 3600 |
| A | `www` | `189.74.96.248` | 3600 |
| A | `admin` | `189.74.96.248` | 3600 |

Saqlagandan keyin **10-60 daqiqa** kuting. Tekshirish (o'z kompyuteringizda):

```bash
ping grizzlygym.uz
ping admin.grizzlygym.uz
```

Ikkalasi ham `189.74.96.248` ni ko'rsatishi kerak. Ko'rsatmasa yana kuting.

---

## 2-qadam: Serverga ulanish

O'z kompyuteringizda terminal oching:

```bash
ssh root@189.74.96.248
```

Parolni kiriting (yozayotganda ko'rinmaydi — bu normal).

Birinchi marta ulanayotganda `yes` deb tasdiqlang.

---

## 3-qadam: Swap qo'shish

1 GB RAM kam — xotira tugab qolmasligi uchun diskdan zaxira ajratamiz:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

Oxirgi buyruq `Swap: 2.0Gi` ko'rsatishi kerak.

---

## 4-qadam: Tizimni yangilash va Node.js

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx
node -v
```

`v22.x.x` yoki yuqori chiqishi kerak.

---

## 5-qadam: Foydalanuvchi yaratish

```bash
adduser --disabled-password --gecos "" grizzly
mkdir -p /home/grizzly/app/landing
chown -R grizzly:grizzly /home/grizzly
```

---

## 6-qadam: Loyihani serverga yuborish

**Bu buyruqni o'z kompyuteringizda bajaring** (serverdan chiqmang, yangi terminal oching).

`grizzly-gym` papkasi turgan joyga o'ting va yuboring:

```bash
scp -r grizzly-gym root@189.74.96.248:/home/grizzly/app/
```

Yuborilgach **server terminaliga qayting** va egalikni to'g'rilang:

```bash
chown -R grizzly:grizzly /home/grizzly/app
```

---

## 7-qadam: Serverni sozlash

```bash
su - grizzly
cd ~/app/grizzly-gym/server
npm install
```

`.env` faylini yarating:

```bash
nano .env
```

Quyidagini **to'liq nusxalab** qo'ying:

```
PORT=4000
JWT_SECRET=O9oPNk2VkwPMvlEa_4hSIR2iJ9yYqcnx7yQdhUGnaG4
CORS_ORIGIN=https://grizzlygym.uz,https://www.grizzlygym.uz,https://admin.grizzlygym.uz
DB_FILE=/home/grizzly/app/grizzly.db
```

Saqlash: `Ctrl+O` → `Enter` → `Ctrl+X`

Bazani to'ldiring:

```bash
npm run seed
```

`admin / admin123` va `kassir / kassir123` chiqadi.

---

## 8-qadam: Boshqaruv tizimini yig'ish

```bash
cd ~/app/grizzly-gym
npm install
npm run build
```

Bir necha daqiqa ketadi. Tugagach `dist/` papkasi hosil bo'ladi.

> Xotira yetmay xato bersa, `npm run build` o'rniga o'z kompyuteringizda yig'ib,
> `dist/` ni `scp` bilan yuboring.

---

## 9-qadam: Doimiy ishga tushirish

```bash
cd ~/app/grizzly-gym/server
npm install -g pm2 2>/dev/null || sudo npm install -g pm2
pm2 start src/index.js --name grizzly
pm2 save
```

`pm2` o'rnatilmasa `exit` bilan root ga qayting va shunday qiling:

```bash
npm install -g pm2
su - grizzly
cd ~/app/grizzly-gym/server
pm2 start src/index.js --name grizzly
pm2 save
pm2 startup
```

Oxirgi buyruq chiqargan qatorni nusxalab, `root` nomidan bajaring.

Tekshirish:

```bash
pm2 status
curl http://localhost:4000/api/health
```

`{"ok":true,...}` chiqishi kerak.

---

## 10-qadam: Nginx sozlash

`root` ga qayting:

```bash
exit
nano /etc/nginx/sites-available/grizzly
```

Quyidagini to'liq nusxalab qo'ying:

```nginx
# Boshqaruv tizimi + API
server {
    listen 80;
    server_name admin.grizzlygym.uz;

    client_max_body_size 8M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Landing sahifa
server {
    listen 80;
    server_name grizzlygym.uz www.grizzlygym.uz;

    root /home/grizzly/app/landing;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Saqlang (`Ctrl+O`, `Enter`, `Ctrl+X`) va yoqing:

```bash
ln -s /etc/nginx/sites-available/grizzly /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

`nginx -t` — `syntax is ok` va `test is successful` chiqishi kerak.

---

## 11-qadam: HTTPS sertifikat

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d grizzlygym.uz -d www.grizzlygym.uz -d admin.grizzlygym.uz
```

Savollarga javob:

- **Email:** o'z pochtangiz (sertifikat tugashidan oldin ogohlantiradi)
- **Shartlar:** `Y`
- **Yangiliklar:** `N`
- **HTTP dan HTTPS ga yo'naltirish:** `2` (majburiy yo'naltirish)

> HTTPS bo'lmasa dastur telefonga o'rnatilmaydi — bu qadam majburiy.

---

## 12-qadam: Xavfsizlik devori

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

---

## 13-qadam: Landing sahifani joylashtirish

**O'z kompyuteringizda** landing loyihasiga o'ting.

`index.html` faylini oching va server manzilini yoqing:

```html
<script>
  window.__GRIZZLY_API__ = 'https://admin.grizzlygym.uz/api';
</script>
```

(Boshidagi `//` belgilarini olib tashlang.)

Yig'ing va yuboring:

```bash
npm install
npm run build
scp -r dist/* root@189.74.96.248:/home/grizzly/app/landing/
```

Server terminalida egalikni to'g'rilang:

```bash
chown -R grizzly:grizzly /home/grizzly/app/landing
```

---

## 14-qadam: Tekshirish

Brauzerda oching:

- `https://grizzlygym.uz` — landing sahifa, qulf belgisi bilan
- `https://admin.grizzlygym.uz` — boshqaruv tizimi

Kiring: `admin` / `admin123`

**Darhol bajaring:**

1. O'ng yuqoridagi menyu → **Ma'lumotlarni tahrirlash** → parolni o'zgartiring
2. Sozlamalar → Adminlar → `kassir` parolini ham o'zgartiring
3. Sayt sozlamalari → telefon, manzil, ish vaqti, rasmlarni to'ldiring
4. Landing sahifani yangilang — o'zgarishlar ko'rinishi kerak

---

## 15-qadam: Avtomatik zaxira nusxa

```bash
su - grizzly
crontab -e
```

Muharrir tanlashni so'rasa `1` (nano) ni tanlang. Oxiriga qo'shing:

```
0 23 * * * cd /home/grizzly/app/grizzly-gym/server && /usr/bin/npm run backup >> /home/grizzly/backup.log 2>&1
```

Saqlang. Har kuni soat 23:00 da nusxa olinadi.

Qo'lda sinab ko'rish:

```bash
cd ~/app/grizzly-gym/server
npm run backup
```

---

## 16-qadam: Telefonga o'rnatish

**Android (Chrome):** `https://admin.grizzlygym.uz` → menyu → "Dastur sifatida o'rnatish"

**iPhone (Safari):** saytga kiring → Ulashish → "Bosh ekranga qo'shish"

> iPhone'da faqat Safari ishlaydi.

---

## Keyinchalik: yangilanish chiqarish

Kodda o'zgarish qilsangiz, o'z kompyuteringizda:

```bash
npm run build
scp -r dist/* root@189.74.96.248:/home/grizzly/app/grizzly-gym/dist/
```

Server terminalida:

```bash
su - grizzly
pm2 restart grizzly
```

---

## Foydali buyruqlar

```bash
pm2 status              # server holati
pm2 logs grizzly        # jurnal (Ctrl+C bilan chiqasiz)
pm2 restart grizzly     # qayta ishga tushirish
free -h                 # xotira
df -h                   # disk
certbot renew --dry-run # sertifikat yangilanishini sinash
```

---

## Muammo chiqsa

**502 Bad Gateway**
```bash
pm2 status
pm2 logs grizzly --lines 50
```

**Sayt ochilmayapti**
DNS hali tarqalmagan bo'lishi mumkin. Kuting yoki tekshiring:
```bash
nslookup grizzlygym.uz
```

**Sertifikat olinmadi**
DNS to'g'ri sozlanganini va 80-port ochiqligini tekshiring:
```bash
ufw status
curl -I http://admin.grizzlygym.uz
```

**Landing ma'lumot olmayapti**
`index.html` da `window.__GRIZZLY_API__` yoqilganini va serverdagi `.env` da
`CORS_ORIGIN` to'g'ri yozilganini tekshiring. Keyin `pm2 restart grizzly`.

**Xotira tugadi (build paytida)**
Swap qo'shilganini tekshiring: `free -h`. Baribir yetmasa o'z kompyuteringizda
yig'ib, `dist/` ni yuboring.
