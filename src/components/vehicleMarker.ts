import type { Vehicle } from '@/lib/types'

// Vehicle glyphs for map markers, as raw SVG inner-path strings (markers are raw
// DOM, not React). Truck / car / bike are Lucide icon paths; van is a matching
// custom silhouette drawn in the same 24×24 stroke style. `currentColor` picks
// up the status colour set on the marker element.
export const VEHICLE_SHAPES: Record<Vehicle['type'], string> = {
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>' +
    '<path d="M15 18H9"/>' +
    '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>' +
    '<circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  car:
    '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' +
    '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  van:
    '<path d="M3 6h9a1 1 0 0 1 1 1v9H4a1 1 0 0 1-1-1z"/>' +
    '<path d="M13 9h3.7a1 1 0 0 1 .8.4l2.3 3.1a1 1 0 0 1 .2.6V16a1 1 0 0 1-1 1h-1"/>' +
    '<path d="M9 17h5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  bike:
    '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>' +
    '<circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
}

/** Full <svg> string for a vehicle type, stroked in currentColor. */
export function markerSVG(type: Vehicle['type']): string {
  return (
    `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_SHAPES[type]}</svg>`
  )
}
