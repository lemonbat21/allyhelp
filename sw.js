// Offline support: the whole app is cached on first visit.
const VERSION = 'cloudcat-v4';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/data.js', 'js/persona.js', 'js/storage.js', 'js/audio.js', 'js/ai.js',
  'assets/cloud-cat.svg', 'assets/running-cat.svg', 'assets/star.svg', 'assets/icon.svg',
  'assets/scene-suitcase.svg', 'assets/scene-train.svg', 'assets/scene-airport.svg',
  'assets/icons/alarm.png', 'assets/icons/backpack.png', 'assets/icons/bath.png', 'assets/icons/bed.png', 'assets/icons/broom.png', 'assets/icons/calendar.png', 'assets/icons/camera.png', 'assets/icons/car.png', 'assets/icons/chair.png', 'assets/icons/gear.png', 'assets/icons/house.png', 'assets/icons/landing.png', 'assets/icons/lift.png', 'assets/icons/magnifier.png', 'assets/icons/passport.png', 'assets/icons/paw.png', 'assets/icons/phone.png', 'assets/icons/plane.png', 'assets/icons/return.png', 'assets/icons/seat.png', 'assets/icons/security.png', 'assets/icons/star.png', 'assets/icons/ticket.png', 'assets/icons/train.png',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // Fonts: cache after first load so they work offline.
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // App files: network first, always re-checking with the server (so a new version shows straight away),
  // cache fallback (so it works offline).
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((r) => {
    const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
