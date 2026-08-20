// Optional build-time Mapbox token. Set VITE_MAPBOX_TOKEN in a .env file to
// enable live Mapbox tiles without pasting a token into Settings each time.
export const ENV_MAPBOX_TOKEN: string = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
