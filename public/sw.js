const STATIC_CACHE = 'clerkfolio-static-v4'
const SHELL_CACHE = 'clerkfolio-shell-v3'
const API_CACHE = 'clerkfolio-api-v2'
const SHELL_PATHS = new Set(['/dashboard', '/cases', '/portfolio'])
const OFFLINE_LATEST_PATH = '/api/offline/latest'
const OFFLINE_FALLBACK_PATH = '/offline'

// On a shared device, a previous user's authenticated API responses must not
// be served to the next user. We cache only the explicitly-warmed offline-latest
// feed (handled in the message listener below). All other /api/* requests pass
// straight to network so post-logout reads cannot hit stale cache.
function isCacheableApi(url) {
  return url.pathname === OFFLINE_LATEST_PATH
}

const CACHEABLE_STATIC = (url) => {
  if (url.pathname.startsWith('/_next/static/')) return true
  const ext = url.pathname.split('.').pop()?.toLowerCase()
  return ['css', 'woff', 'woff2', 'ttf', 'otf', 'ico', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'webmanifest'].includes(ext ?? '')
}

self.addEventListener('install', (event) => {
  // Pre-cache the /offline fallback so users without any cached dashboard
  // shell still see a useful page instead of the browser default error
  // ("This site can't be reached") when their connection drops.
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_FALLBACK_PATH))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, SHELL_CACHE, API_CACHE])
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE' || event.data?.type === 'LOGOUT') {
    event.waitUntil(Promise.all([
      caches.delete(STATIC_CACHE),
      caches.delete(SHELL_CACHE),
      caches.delete(API_CACHE),
    ]))
  }
  if (event.data?.type === 'WARM_OFFLINE_LATEST') {
    event.waitUntil(
      fetch(OFFLINE_LATEST_PATH)
        .then((response) => {
          if (!response.ok) return
          return caches.open(API_CACHE).then((cache) => cache.put(OFFLINE_LATEST_PATH, response.clone()))
        })
        .catch(() => undefined)
    )
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    // Shell paths are network-first and cached, so they can be re-served whole
    // when offline. Every *other* same-origin HTML navigation (/specialties,
    // /timeline, /arcp, /logs, /settings, /export, ...) falls back to the
    // pre-cached /offline card on network failure instead of the browser's
    // default "This site can't be reached" error (F-035) — without caching the
    // (often authenticated) page response.
    if (SHELL_PATHS.has(url.pathname)) {
      event.respondWith(networkFirstWithOfflineFallback(event.request, SHELL_CACHE))
    } else {
      event.respondWith(networkThenOfflineFallback(event.request))
    }
    return
  }

  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url)) {
      event.respondWith(networkFirst(event.request, API_CACHE))
    }
    // Other API requests pass straight to network - we never want to serve
    // authenticated responses from cache, especially after a logout/login
    // churn on a shared device.
    return
  }

  if (event.request.headers.get('accept')?.includes('text/html')) return
  if (!CACHEABLE_STATIC(url)) return

  event.respondWith(cacheFirst(event.request, STATIC_CACHE))
})

function networkFirst(request, cacheName) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone()
      caches.open(cacheName).then((cache) => cache.put(request, clone))
    }
    return response
  }).catch(() => caches.match(request))
}

function networkFirstWithOfflineFallback(request, cacheName) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone()
      caches.open(cacheName).then((cache) => cache.put(request, clone))
    }
    return response
  }).catch(async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_FALLBACK_PATH)
    if (offline) return offline
    return Response.error()
  })
}

function networkThenOfflineFallback(request) {
  // Try the network; on failure serve the pre-cached /offline card. We
  // deliberately do NOT cache the response - these navigations are often
  // authenticated pages and must never be re-served to the next user on a
  // shared device (same rule as the API handler above).
  return fetch(request).catch(async () => {
    const offline = await caches.match(OFFLINE_FALLBACK_PATH)
    if (offline) return offline
    return Response.error()
  })
}

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, clone))
      }
      return response
    })
  })
}
