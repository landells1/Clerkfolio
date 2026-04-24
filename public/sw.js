const CACHE_NAME = 'clinidex-v1'

// Only these public pages may be cached as HTML; all authenticated routes must not be cached.
const PUBLIC_HTML_ROUTES = new Set(['/', '/privacy', '/terms'])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/'])
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Called by the app on logout to purge any cached pages immediately.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('supabase.co')) return

  const url = new URL(event.request.url)
  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html')

  // Only cache HTML for the explicitly allowed public routes.
  // All authenticated routes (dashboard, portfolio, cases, etc.) must never be cached.
  if (acceptsHtml && !PUBLIC_HTML_ROUTES.has(url.pathname)) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((r) => r ?? Response.error()))
  )
})
