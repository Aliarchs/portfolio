// Minimal service worker: offline fallback for navigation and cache-first for images/manifests
const CACHE_NAME = 'site-cache-v2';
// Match images and manifests under images/ including resized variants
const IMG_REGEX = /^(?:https?:)?\/\/[^/]+\/(?:.+)?images\//i;
const LOCAL_IMG_REGEX = /^(?:\.\.\/)?images\//i;
const MANIFEST_REGEX = /images\/project\s*\d+\/manifest\.json$/i;

self.addEventListener('install', (event) => {
  // Pre-cache a minimal offline shell and a placeholder image (if present)
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([
        '/offline.html'
      ].filter(Boolean));
    } catch (e) { /* ignore pre-cache failures */ }
  })());
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
  // Handle navigations: provide an offline fallback page when the network is unavailable
  const isNav = req.mode === 'navigate' || (req.destination === 'document');
  if (isNav) {
    event.respondWith((async () => {
      try {
        // Try network first for navigations to keep content fresh
        return await fetch(req);
      } catch (_) {
        // On failure, serve offline shell from cache if available
        const cache = await caches.open(CACHE_NAME);
        const offline = await cache.match('/offline.html', { ignoreSearch: true });
        if (offline) return offline;
        // Last resort: minimal inline response
        return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><h1>Offline</h1><p>The page is not available offline.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }
  const isImage = req.destination === 'image' || IMG_REGEX.test(req.url) || LOCAL_IMG_REGEX.test(url.pathname);
  const isManifest = MANIFEST_REGEX.test(url.pathname);

  if (isImage || isManifest) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // Respect URL search params (e.g., ?v=20251019c) so versioned URLs fetch fresh
      const cached = await cache.match(req);
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
        // If network fails and nothing in cache:
        // For images, do not return a placeholder. Fail explicitly so the page doesn't show a fake image.
        // Clear offline response for non-image assets
        return new Response('Offline: resource unavailable', { status: 503, statusText: 'Service Unavailable' });
      }
    })());
  }
});

// Support on-demand pre-caching of a list of URLs sent from the page.
// This lets project pages ask the SW to cache all gallery images once, so subsequent
// renders and scrolling don't hit the network again.
self.addEventListener('message', (event) => {
  try {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'PRECACHE_URLS' && Array.isArray(data.urls) && data.urls.length) {
      event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const unique = Array.from(new Set(data.urls.filter(u => typeof u === 'string' && u)));
        // Fetch and cache each URL individually to continue on errors
        await Promise.all(unique.map(async (u) => {
          try {
            const res = await fetch(u, { cache: 'no-cache' });
            if (res && res.ok) await cache.put(u, res.clone());
          } catch (_) { /* ignore individual failures */ }
        }));
      })());
    }
  } catch (_) { /* ignore */ }
});
