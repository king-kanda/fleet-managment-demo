// Mapbox token, injected at build time. Set VITE_MAPBOX_TOKEN as an environment
// variable — locally in a .env file, or in Vercel under Project Settings →
// Environment Variables (Vite exposes any VITE_-prefixed var to the client).
// When present, the map upgrades from the free CARTO basemap to Mapbox tiles.
export const ENV_MAPBOX_TOKEN: string = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
