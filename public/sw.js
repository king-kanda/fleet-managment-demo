/**
 * FleetPulse service worker.
 *
 * Deliberately small and hand-written — the app is a static Vite build, so the
 * only two caching rules that matter are:
 *
 *   1. Hashed build assets (/assets/*) are immutable → cache first, forever.
 *   2. Navigations are network first, falling back to the cached app shell, so
 *      a deploy is picked up immediately but the app still opens offline.
 *
 * Bump CACHE_VERSION to evict everything from older builds.
 */
const CACHE_VERSION = 'fleetpulse-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png']

/**
 * Precache the shell plus the hashed bundles it references. The asset file names
 * change every build, so they are discovered by reading index.html rather than
 * hard-coded here — without them a cold offline start would serve the HTML and
 * then fail on the missing scripts.
 */
async function precache() {
  const cache = await caches.open(CACHE_VERSION)
  // Individual failures (a missing optional asset) must not fail the install.
  await Promise.allSettled(SHELL.map((url) => cache.add(url)))
  try {
    const res = await fetch('/index.html', { cache: 'reload' })
    if (!res.ok) return
    const html = await res.text()
    await cache.put('/index.html', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
    await Promise.allSettled(assets.map((url) => cache.add(url)))
  } catch {
    // Offline at install time — the runtime handler will fill the cache later.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Never touch cross-origin traffic: map tiles and the xAI API must always go
  // to the network, and caching them here would only get in the way.
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    )
    return
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((res) => {
        // Only store complete, same-origin successes.
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy))
        }
        return res
      })
    }),
  )
})
