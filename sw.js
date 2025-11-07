const CACHE_VERSION = 'munkaora-shell-v20250206';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-512-maskable.svg',
];

const log = (...args) => console.log('[SW]', ...args);

self.addEventListener('install', (event) => {
  log('Installing', CACHE_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => {
        log('Precaching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
      .catch((error) => log('Install failed', error))
  );
});

self.addEventListener('activate', (event) => {
  log('Activating', CACHE_VERSION);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => {
              log('Removing old cache', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
      .catch((error) => log('Activation failed', error))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log('Skip waiting requested');
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(handleAssetRequest(request));
});

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    log('Navigation fetch failed, serving shell', error);
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('./index.html');
  }
}

async function handleAssetRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    log('Asset fetch failed and not cached', request.url, error);
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}
