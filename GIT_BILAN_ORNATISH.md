# Grizzly GYM — git orqali o'rnatish

**Repozitoriy:** `https://github.com/eldorsattarov/Grizzly_GYM_Dashboard`
**Server IP:** `189.74.96.248`
**Domen:** `grizzlygym.uz`

Bu fayl `BUYRUQLAR_grizzlygym.md` ning **6-qadamini** almashtiradi va yangilanish
chiqarishni soddalashtiradi. Qolgan qadamlar o'zgarmaydi.

---

# A qism — kodni GitHub'ga yuborish

Buni **o'z kompyuteringizda** bajarasiz.

## A1. Git o'rnatilganini tekshiring

```bash
git --version
```

Chiqmasa [git-scm.com](https://git-scm.com) dan yuklab oling.

Birinchi marta ishlatayotgan bo'lsangiz o'zingizni tanishtiring:

```bash
git config --global user.name "Eldor Sattarov"
git config --global user.email "sizning@pochta.uz"
```

## A2. Loyihani tayyorlang

`grizzly-gym` papkasiga o'ting:

```bash
cd grizzly-gym
```

`.gitignore` faylida quyidagilar borligini tekshiring — bular **hech qachon**
GitHub'ga tushmasligi kerak:

```
node_modules/
dist/
.env
*.db
backups/
```

> Bu muhim: `.env` da maxfiy kalit, `*.db` da mijozlar ma'lumoti bor.
> Arxivdagi `.gitignore` allaqachon shunday sozlangan.

## A3. Yuborish

```bash
git init
git add .
git commit -m "Grizzly GYM boshqaruv tizimi"
git branch -M main
git remote add origin https://github.com/eldorsattarov/Grizzly_GYM_Dashboard.git
git push -u origin main
```

GitHub login va parol so'rasa — parol o'rniga **token** kerak bo'ladi:

`github.com` → o'ng yuqoridagi rasm → **Settings** → pastda **Developer settings**
→ **Personal access tokens** → **Tokens (classic)** → **Generate new token**

`repo` katagini belgilang, muddatni tanlang, yarating. Chiqqan matnni nusxalang —
u faqat bir marta ko'rinadi. Parol so'ralganda o'shani qo'yasiz.

## A4. Tekshiring

Brauzerda repozitoriyni oching. Ko'rinishi kerak:

```
src/  server/  index.html  package.json  README.md  ...
```

**Ko'rinmasligi kerak:** `.env`, `*.db`, `node_modules`

Agar `.env` tushib qolgan bo'lsa — darhol o'chiring va **maxfiy kalitni
almashtiring**, chunki u endi ochiq hisoblanadi.

---

# B qism — serverda git bilan olish

Bu `BUYRUQLAR_grizzlygym.md` dagi **6-qadam o'rniga**.

## Agar repozitoriy ochiq (public) bo'lsa

Server terminalida:

```bash
su - grizzly
mkdir -p ~/app && cd ~/app
git clone https://github.com/eldorsattarov/Grizzly_GYM_Dashboard.git grizzly-gym
cd grizzly-gym
ls
```

Fayllar ko'rinsa — tayyor. **7-qadamga** o'ting.

## Agar repozitoriy yopiq (private) bo'lsa

Serverga o'qish huquqi berish kerak. Eng xavfsiz yo'l — **deploy key**.

Server terminalida kalit yarating:

```bash
su - grizzly
ssh-keygen -t ed25519 -C "grizzly-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Chiqqan qatorni to'liq nusxalang (`ssh-ed25519 AAAA...` bilan boshlanadi).

Brauzerda: repozitoriy → **Settings** → **Deploy keys** → **Add deploy key**

- **Title:** `grizzly-server`
- **Key:** nusxalagan matnni qo'ying
- **Allow write access:** belgilamang (serverga faqat o'qish kerak)

Saqlang. Endi serverda:

```bash
ssh -T git@github.com
```

`Hi eldorsattarov/Grizzly_GYM_Dashboard! You've successfully authenticated`
chiqishi kerak. Birinchi marta `yes` deb tasdiqlaysiz.

Klonlang:

```bash
cd ~/app
git clone git@github.com:eldorsattarov/Grizzly_GYM_Dashboard.git grizzly-gym
cd grizzly-gym
ls
```

**7-qadamga** o'ting.

---

# C qism — yangilanish chiqarish

O'rnatilgandan keyin har safar shu tartib.

## Kompyuteringizda

O'zgarish qiling, keyin:

```bash
git add .
git commit -m "nima o'zgardi"
git push
```

## Serverda

```bash
ssh root@189.74.96.248
su - grizzly
cd ~/app/grizzly-gym

git pull
npm install          # yangi paket qo'shilgan bo'lsa
npm run build
cd server && npm install
pm2 restart grizzly
```

Ikki daqiqa. `scp` yo'q, fayl sudrash yo'q.

### Bitta buyruqqa jamlash

Serverda qulaylik uchun skript yarating:

```bash
su - grizzly
nano ~/yangilash.sh
```

Ichiga:

```bash
#!/bin/bash
set -e
cd ~/app/grizzly-gym
echo "→ Yangi kod olinmoqda..."
git pull
echo "→ Paketlar..."
npm install --silent
cd server && npm install --silent && cd ..
echo "→ Yig'ilmoqda..."
npm run build
echo "→ Qayta ishga tushirilmoqda..."
pm2 restart grizzly
echo "✓ Tayyor"
```

Saqlang va ishga tushirish huquqini bering:

```bash
chmod +x ~/yangilash.sh
```

Endi yangilanish uchun bitta buyruq yetadi:

```bash
~/yangilash.sh
```

---

# Landing sahifa uchun

Landing alohida loyiha. Ikki variant:

## Variant 1 — alohida repozitoriy (tavsiya etiladi)

GitHub'da yangi repozitoriy oching, masalan `Grizzly_GYM_Landing`. Keyin:

```bash
cd grizzly-landing
git init
git add .
git commit -m "Landing sahifa"
git branch -M main
git remote add origin https://github.com/eldorsattarov/Grizzly_GYM_Landing.git
git push -u origin main
```

Serverda:

```bash
su - grizzly
cd ~/app
git clone https://github.com/eldorsattarov/Grizzly_GYM_Landing.git landing-src
cd landing-src
npm install
npm run build
cp -r dist/* ~/app/landing/
```

## Variant 2 — Netlify orqali (osonroq)

`netlify.com` da ro'yxatdan o'ting → **Add new site** → **Import from Git** →
landing repozitoriyni tanlang.

Sozlamalar:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Environment variables:** `VITE_API_URL` = `https://admin.grizzlygym.uz/api`

Shundan keyin har `git push` da sayt avtomatik yangilanadi. Bepul, tez, va
serveringizga yuk tushmaydi.

Bu holda DNS da `@` va `www` yozuvlarini Netlify bergan manzilga yo'naltirasiz,
`admin` esa serveringizda qoladi.

---

# Muhim eslatmalar

**`.env` hech qachon GitHub'da bo'lmaydi.** U faqat serverda yaratiladi va
faqat o'sha yerda turadi. Yangi server o'rnatsangiz qo'lda yozasiz.

**Baza ham GitHub'da bo'lmaydi.** `grizzly.db` — mijozlar ma'lumoti. U server
diskida va `backups/` papkasida saqlanadi.

**Repozitoriyni yopiq (private) qiling** agar hali ochiq bo'lsa:
Settings → pastda **Danger Zone** → **Change visibility** → Private.

Kod ochiq bo'lishi xavfli emas (sirlar `.env` da), lekin biznes mantiqingizni
raqobatchilarga ko'rsatishning hojati yo'q.

**Har o'zgarishdan keyin commit qiling.** Bir hafta ishlab, keyin bitta katta
commit qilish o'rniga kichik-kichik commitlar qiling — xato chiqsa qaysi
o'zgarish sabab bo'lganini topish oson bo'ladi.
