const CACHE_NAME = 'clinidex-static-v2'

// Only cache genuinely immutable static assets — never HTML.
// Next.js /_next/static/ files are content-hashed and safe to cache indefinitely.
// HTML is always fetched from the network so no page with auth state is ever cached.
const CACHEABLE = (url) => {
  // Next.js hashed bundles — safe to cache forever
  if (url.pathname.startsWith('/_next/static/')) return true
  // Public static files by extension
  const ext = url.pathname.split('.').pop()?.toLowerCase()
  return ['css', 'woff', 'woff2', 'ttf', 'otf', 'ico', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext ?? '')
}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Called by the app on logout to purge any cached assets immediately.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Only cache our own origin — never third-party (Supabase, Stripe, etc.)
  if (url.origin !== self.location.origin) return

  // Never cache HTML — all navigation requests go straight to the network.
  // This ensures authenticated pages are never served stale from the cache.
  if (event.request.headers.get('accept')?.includes('text/html')) return

  if (!CACHEABLE(url)) return

  // Cache-first for static assets (they are content-hashed — safe)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
