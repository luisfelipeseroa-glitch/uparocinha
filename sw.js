/* Service worker: primeiro a rede (sempre pega a versão nova do site); o cache só serve de reserva
   quando está sem internet. Nunca guarda respostas do Supabase nem de outros sites. */
const CACHE_NAME = 'upa-rocinha-v6';
const ASSETS = ['./', './index.html', './manifest.json', './css/app.css', './img/logo-upa.png', './img/logo-gnosis.jpg',
  './js/config.js', './js/core.js', './js/forms.js', './js/legacy.js', './js/boot.js', './js/pendencias.js', './js/pwa.js', './icon-192.png', './icon-512.png',
  './js/vendor/supabase-2.45.4.js', './js/vendor/chart-4.4.4.umd.js'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // deixa passar (Supabase, CDNs...)
  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copia = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copia)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
