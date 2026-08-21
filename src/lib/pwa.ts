/**
 * Service worker registration. Production only — in dev the SW would serve
 * stale modules and fight Vite's HMR.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // A failed registration costs offline support, nothing else.
      // eslint-disable-next-line no-console
      console.warn('[PWA] service worker registration failed:', err)
    })
  })
}
