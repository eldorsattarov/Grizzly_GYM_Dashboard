# VPS ga o'rnatish — bosqichma-bosqich

Tizimni internetga chiqarish. Natijada telefondan, planshetdan va istalgan
kompyuterdan kirish mumkin bo'ladi, hamda dasturni telefon ekraniga
ikonka sifatida o'rnatsa bo'ladi.

**Kerak bo'ladi:** VPS (oyiga ~5$), domen (yiliga ~10$), 40 daqiqa vaqt.

---

## 1. VPS olish

Tavsiya: **Hetzner** (CX22, ~4€/oy) yoki **DigitalOcean** (Basic, 6$/oy).
O'zbekistondan foydalansangiz Germaniya yoki Finlyandiya serverlari tezroq.

Buyurtma berishda:

- **OS:** Ubuntu 24.04 LTS
- **Hajm:** eng arzoni yetadi — SQLite ishlatamiz, og'ir emas
- **SSH kaliti:** qo'shing (parolli kirishdan xavfsizroq)

Server tayyor bo'lgach IP manzilini olasiz, masalan `95.217.10.20`.

---

## 2. Domenni serverga yo'naltirish

Domen sotib olgan joyingizda (masalan `ahost.uz`, `Namecheap`) DNS
sozlamalariga kiring va ikkita yozuv qo'shing:

| Turi | Nomi | Qiymati |
|------|------|---------|
| A | `@` | `95.217.10.20` |
| A | `admin` | `95.217.10.20` |

Birinchisi — landing sahifa uchun (`grizzlygym.uz`).
Ikkinchisi — boshqaruv tizimi uchun (`admin.grizzlygym.uz`).

> DNS yangilanishi 10 daqiqadan bir necha soatgacha vaqt olishi mumkin.
> Tekshirish: `ping admin.grizzlygym.uz` — server IP sini ko'rsatishi kerak.

---

## 3. Serverga ulanish

```bash
ssh root@95.217.10.20
```

Birinchi navbatda tizimni yangilaymiz:

```bash
apt update && apt upgrade -y
```

---

## 4. Node.js o'rnatish

Bizga **22.5 dan yuqori** versiya kerak (ichki SQLite moduli uchun):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
```

`v22.x.x` yoki undan yuqori chiqishi kerak.

---

## 5. Alohida foydalanuvchi yaratish

Dasturni `root` nomidan ishlatish xavfli — alohida foydalanuvchi ochamiz:

```bash
adduser --disabled-password --gecos "" grizzly
mkdir -p /home/grizzly/app
chown -R grizzly:grizzly /home/grizzly
```

---

## 6. Loyihani yuklash

**O'z kompyuteringizda** (server terminalida emas) loyihalarni yuboring:

```bash
scp -r grizzly-gym root@95.217.10.20:/home/grizzly/app/
```

Yoki git ishlatsangiz, serverda:

```bash
su - grizzly
cd ~/app
git clone https://github.com/sizning-hisobingiz/grizzly-gym.git
```

Egalikni to'g'rilang:

```bash
chown -R grizzly:grizzly /home/grizzly/app
```

---

## 7. Serverni sozlash

```bash
su - grizzly
cd ~/app/grizzly-gym/server
npm install
```

Maxfiy kalit yarating:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`.env` faylini yarating:

```bash
nano .env
```

Ichiga yozing (kalitni yuqorida chiqqaniga almashtiring):

```
PORT=4000
JWT_SECRET=bu-yerga-yuqorida-chiqqan-kalit
CORS_ORIGIN=https://grizzlygym.uz,https://admin.grizzlygym.uz
DB_FILE=/home/grizzly/app/grizzly.db
```

> Bazani loyiha papkasidan **tashqarida** saqlash yaxshi — kodni yangilaganda
> tasodifan o'chib ketmaydi.

Bazani to'ldiring va sinab ko'ring:

```bash
npm run seed
npm start
```

`Grizzly API → http://localhost:4000/api` chiqsa, `Ctrl+C` bilan to'xtating.

---

## 8. Boshqaruv tizimini yig'ish

```bash
cd ~/app/grizzly-gym
npm install
npm run build
```

`dist/` papkasi hosil bo'ladi — server uni avtomatik topadi.

---

## 9. Doimiy ishlatish (pm2)

Terminal yopilganda server to'xtamasligi uchun:

```bash
sudo npm install -g pm2
cd ~/app/grizzly-gym/server
pm2 start src/index.js --name grizzly
pm2 save
```

Kompyuter qayta yoqilganda avtomatik ishga tushishi uchun:

```bash
pm2 startup
```

Chiqqan buyruqni nusxalab, `root` nomidan bajaring.

Foydali buyruqlar:

```bash
pm2 logs grizzly      # jurnal
pm2 restart grizzly   # qayta ishga tushirish
pm2 status            # holat
```

---

## 10. Nginx va HTTPS

`root` ga qayting (`exit` bosing) va nginx o'rnating:

```bash
apt install -y nginx
```

Sozlama faylini yarating:

```bash
nano /etc/nginx/sites-available/grizzly
```

Ichiga:

```nginx
# Boshqaruv tizimi + API
server {
    listen 80;
    server_name admin.grizzlygym.uz;

    client_max_body_size 8M;      # rasm yuklash uchun

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

Yoqing va tekshiring:

```bash
ln -s /etc/nginx/sites-available/grizzly /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Sertifikat oling (bepul, avtomatik yangilanadi):

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d grizzlygym.uz -d www.grizzlygym.uz -d admin.grizzlygym.uz
```

Savollarga javob bering, HTTP dan HTTPS ga yo'naltirishni **yoqing**.

> **PWA uchun HTTPS majburiy.** Sertifikatsiz dastur telefonga o'rnatilmaydi.

---

## 11. Landing sahifani joylashtirish

**O'z kompyuteringizda** landing loyihasini yig'ing:

```bash
cd grizzly-landing
npm run build
```

`dist/index.html` ichida server manzilini ko'rsating:

```html
<script>
  window.__GRIZZLY_API__ = 'https://admin.grizzlygym.uz/api';
</script>
```

Serverga yuboring:

```bash
scp -r dist/* root@95.217.10.20:/home/grizzly/app/landing/
```

Serverda egalikni to'g'rilang:

```bash
chown -R grizzly:grizzly /home/grizzly/app/landing
```

> Muqobil: landing'ni **Netlify** yoki **Vercel** ga qo'ying — bepul va tezroq.
> Bu holda DNS da `@` yozuvini o'sha xosting ko'rsatgan manzilga o'zgartirasiz.

---

## 12. Xavfsizlik devori

Faqat kerakli portlarni ochamiz:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

4000-port tashqaridan yopiq qoladi — unga faqat nginx murojaat qiladi.

---

## 13. Birinchi kirish

Brauzerda oching: `https://admin.grizzlygym.uz`

Kirish: `admin` / `admin123`

**Darhol bajaring:**

1. Sozlamalar → Adminlar → har biriga yangi parol qo'ying
2. Ishlatilmaydigan hisoblarni o'chiring
3. Sayt sozlamalari → telefon, manzil, ish vaqti, rasmlarni to'ldiring

---

## 14. Telefonga o'rnatish

**Android (Chrome):**
Saytga kiring → o'ng yuqoridagi menyu → **"Dastur sifatida o'rnatish"**
Yoki brauzer o'zi taklif qiladi.

**iPhone (Safari):**
Saytga kiring → pastdagi **Ulashish** tugmasi → **"Bosh ekranga qo'shish"**

> iPhone'da faqat Safari ishlaydi — Chrome yoki boshqa brauzerda o'rnatib
> bo'lmaydi. Bu Apple cheklovi.

**Kompyuterda (Chrome, Edge):**
Manzil qatorining o'ng tomonidagi o'rnatish belgisini bosing.

O'rnatilgandan keyin dastur alohida oynada ochiladi — brauzer manzil qatori
ko'rinmaydi, xuddi oddiy ilovadek.

---

## 15. Avtomatik zaxira nusxa

Har kuni kechqurun nusxa olish:

```bash
su - grizzly
crontab -e
```

Oxiriga qo'shing:

```
0 23 * * * cd /home/grizzly/app/grizzly-gym/server && /usr/bin/npm run backup >> /home/grizzly/backup.log 2>&1
```

Nusxalar `server/backups/` papkasiga tushadi, oxirgi 30 tasi saqlanadi.

> **Muhim:** nusxalarni vaqti-vaqti bilan serverdan tashqariga ham ko'chiring.
> O'z kompyuteringizga yuklash:
> ```bash
> scp -r root@95.217.10.20:/home/grizzly/app/grizzly-gym/server/backups ./
> ```

---

## Yangilanish chiqarish

Kodda o'zgarish qilsangiz:

```bash
# O'z kompyuteringizda
npm run build
scp -r dist/* root@95.217.10.20:/home/grizzly/app/grizzly-gym/dist/

# Serverda
su - grizzly
pm2 restart grizzly
```

Foydalanuvchilar sahifani yangilaganda yangi versiyani oladi — servis-vorker
buni o'zi hal qiladi.

> Servis-vorker o'zgargan bo'lsa `sw.js` ichidagi `VERSION` ni oshiring
> (`v1` → `v2`), aks holda eski kesh qolib ketishi mumkin.

---

## Tekshirish ro'yxati

- [ ] `https://admin.grizzlygym.uz` ochiladi va qulf belgisi bor
- [ ] `https://grizzlygym.uz` landing ochiladi
- [ ] Landing telefon raqami boshqaruvdagi bilan bir xil
- [ ] Yangi parol bilan kirish ishlaydi, `admin123` ishlamaydi
- [ ] Kassir bilan kirganda Sozlamalar ko'rinmaydi
- [ ] Telefonda "Bosh ekranga qo'shish" ishlaydi
- [ ] O'rnatilgan dasturda manzil qatori ko'rinmaydi
- [ ] `pm2 status` — `online` holatda
- [ ] `npm run backup` nusxa yaratadi

---

## Muammolar

**502 Bad Gateway**
Server ishlamayapti. `pm2 status` va `pm2 logs grizzly` ni tekshiring.

**Sayt ochiladi, lekin ma'lumot kelmaydi**
CORS muammosi. `.env` dagi `CORS_ORIGIN` da landing domeni borligini
tekshiring, keyin `pm2 restart grizzly`.

**"O'rnatish" tugmasi chiqmayapti**
HTTPS ishlayotganini tekshiring. Sertifikatsiz PWA o'rnatilmaydi.
Chrome'da: `F12` → `Application` → `Manifest` — xatolar ko'rinadi.

**Rasm yuklanmayapti**
Nginx da `client_max_body_size 8M;` borligini tekshiring.

**Sertifikat muddati tugadi**
Certbot avtomatik yangilaydi. Qo'lda: `certbot renew`.
