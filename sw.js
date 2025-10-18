// Minimal service worker: cache-first for images and manifests to keep galleries snappy
const CACHE_NAME = 'site-cache-v1';
// Match images and manifests under images/ including resized variants
const IMG_REGEX = /^(?:https?:)?\/\/[^/]+\/(?:.+)?images\//i;
const LOCAL_IMG_REGEX = /^(?:\.\.\/)?images\//i;
const MANIFEST_REGEX = /images\/project\s*\d+\/manifest\.json$/i;

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up old caches if we bump the version
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isImage = req.destination === 'image' || IMG_REGEX.test(req.url) || LOCAL_IMG_REGEX.test(url.pathname);
  const isManifest = MANIFEST_REGEX.test(url.pathname);

  if (isImage || isManifest) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) {
        // Update in background
        event.waitUntil(fetch(req.clone()).then(res => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {}));
        return cached;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        // If network fails and nothing in cache, just error through
        return fetch(req);
      }
    })());
  }
});
