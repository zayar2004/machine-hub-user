/* Machine Hub User — Service Worker (offline cache) */
const VERSION = 'mhu-v1';
const STATIC = VERSION + '-static';

const PRECACHE = [
  '/',
  '/search',
  '/settings',
  '/help/format',
  '/static/css/tokens.css',
  '/static/css/user.css',
  '/static/css/mh-user.css',
  '/static/js/db.js',
  '/static/js/excel.js',
  '/static/js/search.js',
  '/static/js/settings.js',
  '/static/js/machine.js',
  '/static/js/modal.js',
  '/static/js/icons.js',
  '/static/js/theme.js',
  '/static/vendor/xlsx.full.min.js',
  '/static/vendor/qrcode.min.js',
  '/static/manifest.json',
  '/static/icons/sprite.svg',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.method !== 'GET') return;

  // Static: cache-first
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(
      caches.open(STATIC).then(c =>
        c.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req).then(res => {
            if (res.ok) c.put(req, res.clone());
            return res;
          }).catch(() => new Response('', { status: 504 }));
        })
      )
    );
    return;
  }

  // HTML: stale-while-revalidate
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      caches.open(STATIC).then(c =>
        c.match(req).then(hit => {
          const fetchPromise = fetch(req).then(res => {
            if (res.ok) c.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || fetchPromise;
        })
      )
    );
    return;
  }
});
