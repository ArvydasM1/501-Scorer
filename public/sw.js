/* Service worker: caches the app shell so the scorer opens and works offline.
   Strategy: serve from cache immediately, refresh the cache from the network in the
   background (stale-while-revalidate), so a new deploy is picked up on the next open. */
const CACHE = 'darts-scorer-shell-v1';
const SHELL = ['./', './index.html', './app.js', './styles.css', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      if (cached) { refresh.catch(() => {}); return cached; }
      const fresh = await refresh;
      if (fresh) return fresh;
      // Offline and not cached: fall back to the app shell for page navigations.
      if (request.mode === 'navigate') return cache.match('./index.html');
      return Response.error();
    })
  );
});
