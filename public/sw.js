/**
 * SportlySocial — Service Worker (sw.js)
 *
 * Strategy:
 *  - App shell (HTML, CSS, JS): Network-first with cache fallback
 *  - ESPN API calls: Network-first with stale fallback (5-min TTL)
 *  - Supabase API calls: Network-only (auth + realtime must be fresh)
 *  - Everything else: Network-first
 *
 * Cache names are versioned — bump CACHE_VERSION on each deploy.
 */

const CACHE_VERSION    = 'sportlysocial-v34';
const SHELL_CACHE      = `${CACHE_VERSION}-shell`;
const DATA_CACHE       = `${CACHE_VERSION}-data`;
const ESPN_CACHE_TTL   = 5 * 60 * 1000; // 5 minutes

/* ── App shell assets to pre-cache ── */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/script.js',
  '/js/identity.js',
  '/js/auth-v22.js',
  '/js/chat.js',
  '/manifest.json',
  '/brand/brand.js',
  '/brand/sportlysocial-logo-horizontal.png',
  '/brand/sportlysocial-logo-reverse.png',
  '/brand/sportlysocial-logo-stacked.png',
  '/brand/sportlysocial-app-icon.png',
  '/brand/favicon.png',
  '/brand/icon-192.png',
  '/brand/icon-512.png',
  // Supabase CDN (cached by the browser but listed for completeness)
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
];

/* ══════════════════════════════════════
   INSTALL — pre-cache app shell
══════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      // addAll fails silently for optional assets (icons may not exist in dev)
      return Promise.allSettled(
        SHELL_ASSETS.map(url => cache.add(url).catch(() => { /* ignore missing assets */ }))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ══════════════════════════════════════
   ACTIVATE — clean old caches
══════════════════════════════════════ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            (key.startsWith('gs-') || key.startsWith('roarline-') || key.startsWith('sportlysocial-')) &&
            key !== SHELL_CACHE &&
            key !== DATA_CACHE
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ══════════════════════════════════════
   FETCH — routing logic
══════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept Supabase, auth, or non-GET requests
  if (request.method !== 'GET')         return;
  if (url.hostname.includes('supabase')) return;
  if (url.pathname.startsWith('/auth/'))  return;

  // ESPN API → network-first with TTL cache
  if (url.hostname.includes('espn.com')) {
    event.respondWith(networkFirstWithTTL(request, DATA_CACHE, ESPN_CACHE_TTL));
    return;
  }

  // App shell → network-first so deploys do not require a hard refresh
  if (isShellAsset(url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else → network-first
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

/* ══════════════════════════════════════
   STRATEGIES
══════════════════════════════════════ */

/** Cache-first: serve from cache, fall back to network */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/** Network-first: try network, fall back to cache */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/** Network-first with timestamp-based TTL for ESPN API responses */
async function networkFirstWithTTL(request, cacheName, ttl) {
  const cache      = await caches.open(cacheName);
  const cachedResp = await cache.match(request);

  if (cachedResp) {
    const cachedDate = new Date(cachedResp.headers.get('sw-cached-at') || 0);
    const age = Date.now() - cachedDate.getTime();
    if (age < ttl) return cachedResp;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone and inject cache timestamp header
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', new Date().toISOString());
      const cachedResponse = new Response(await response.clone().blob(), {
        status:     response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, cachedResponse);
    }
    return response;
  } catch {
    if (cachedResp) return cachedResp; // serve stale on error
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function isShellAsset(url) {
  return (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css')  ||
    url.pathname.endsWith('.js')   ||
    url.pathname.endsWith('.json') && url.pathname !== '/manifest.json' ||
    url.pathname.startsWith('/assets/icons/') ||
    url.pathname.startsWith('/assets/logos/') ||
    url.pathname.startsWith('/brand/')
  );
}

/* ══════════════════════════════════════
   MESSAGE — manual cache invalidation
══════════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_DATA_CACHE') {
    caches.delete(DATA_CACHE).then(() => {
      event.source?.postMessage({ type: 'DATA_CACHE_CLEARED' });
    });
  }
});
