const STATIC_CACHE = 'clerkfolio-static-v3'
const SHELL_CACHE = 'clerkfolio-shell-v1'
const API_CACHE = 'clerkfolio-api-v1'
const SHELL_PATHS = new Set(['/dashboard', '/cases', '/portfolio'])

const CACHEABLE_STATIC = (url) => {
  if (url.pathname.startsWith('/_next/static/')) return true
  const ext = url.pathname.split('.').pop()?.toLowerCase()
  return ['css', 'woff', 'woff2', 'ttf', 'otf', 'ico', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'webmanifest'].includes(ext ?? '')
}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, SHELL_CACHE, API_CACHE])
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(Promise.all([
      caches.delete(STATIC_CACHE),
      caches.delete(SHELL_CACHE),
      caches.delete(API_CACHE),
    ]))
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate' && SHELL_PATHS.has(url.pathname)) {
    event.respondWith(networkFirst(event.request, SHELL_CACHE))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, API_CACHE))
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
