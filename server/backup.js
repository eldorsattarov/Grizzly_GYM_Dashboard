// Bazadan zaxira nusxa oladi: node backup.js
// Nusxalar backups/ papkasiga sana bilan saqlanadi.
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const src = process.env.DB_FILE || './grizzly.db';
if (!fs.existsSync(src)) {
  console.error('Baza topilmadi:', src);
  process.exit(1);
}

const dir = 'backups';
fs.mkdirSync(dir, { recursive: true });

const now = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}` +
              `_${p2(now.getHours())}-${p2(now.getMinutes())}`;

const dest = path.join(dir, `grizzly-${stamp}.db`);
fs.copyFileSync(src, dest);

const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`Zaxira nusxa tayyor: ${dest} (${kb} KB)`);

// 30 tadan ortiq nusxa bo'lsa eskilarini o'chiramiz
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.db')).sort();
if (files.length > 30) {
  files.slice(0, files.length - 30).forEach((f) => {
    fs.unlinkSync(path.join(dir, f));
    console.log('Eski nusxa o\'chirildi:', f);
  });
}
