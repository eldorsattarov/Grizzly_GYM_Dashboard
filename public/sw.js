// ============================================================
// GRIZZLY GYM — SERVIS-VORKER
//
// Vazifasi: dasturni telefonga o'rnatilgandek tez ochish.
//
// MUHIM QOIDA: API javoblari HECH QACHON keshlanmaydi.
// A'zolar, to'lovlar va qarzlar har doim serverdan olinadi —
// eski ma'lumot ko'rsatish pul hisobida xatoga olib keladi.
// ============================================================

const VERSION = 'v1';
const SHELL = `grizzly-shell-${VERSION}`;
const ASSETS = `grizzly-assets-${VERSION}`;

// Internet yo'q bo'lganda ko'rsatiladigan sahifa
const OFFLINE_HTML = `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aloqa yo'q</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0b0b0b;color:#f5f5f5;font-family:system-ui,sans-serif;text-align:center;padding:24px}
  .b{max-width:340px}
  h1{color:#FFD700;font-size:22px;margin:0 0 12px}
  p{color:#8a8a8a;line-height:1.6;margin:0 0 22px;font-size:15px}
  button{background:#FFD700;color:#17130a;border:0;border-radius:10px;
         padding:13px 26px;font-size:15px;font-weight:700;cursor:pointer}
</style></head>
<body><div class="b">
  <h1>Aloqa yo'q</h1>
  <p>Internetga ulanishni tekshiring. Ma'lumotlar serverda saqlanadi,
     shuning uchun ishlash uchun aloqa kerak.</p>
  <button onclick="location.reload()">Qayta urinish</button>
</div></body></html>`;

// ---- O'rnatish ----
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.put('/offline', new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })))
      .then(() => self.skipWaiting())
  );
});

// ---- Faollashtirish: eski keshlarni tozalaymiz ----
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ---- So'rovlarni boshqarish ----
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1) API — hech qachon keshlanmaydi
  if (url.pathname.startsWith('/api')) return;

  // 2) Sahifa ochilishi — avval tarmoq, ulanmasa oxirgi nusxa
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/offline'))
        )
    );
    return;
  }

  // 3) Statik fayllar — nomida xesh bor, shuning uchun keshdan olsa xavfsiz
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
