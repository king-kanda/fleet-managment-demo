import type { Vehicle } from '@/lib/types'

// Inline SVG silhouettes for map markers (strings, not React — markers are raw
// DOM elements). `currentColor` picks up the status colour set on the element.
export const VEHICLE_SHAPES: Record<Vehicle['type'], string> = {
  truck:
    '<path d="M1 5h11v8H1z"/><path d="M12 8h4l3 3v2h-7z"/><circle cx="6" cy="15.5" r="1.9"/><circle cx="16" cy="15.5" r="1.9"/>',
  van:
    '<path d="M2 6h9v7H2z"/><path d="M11 8h4l3 3v2h-7z"/><circle cx="6" cy="15.5" r="1.9"/><circle cx="16" cy="15.5" r="1.9"/>',
  car:
    '<path d="M3 13l1.6-4.2A2 2 0 0 1 6.5 7.5h7A2 2 0 0 1 15.4 8.8L17 13"/><path d="M2.5 13h15v1.5a1.5 1.5 0 0 1-1.5 1.5h-.3M6.3 16H4a1.5 1.5 0 0 1-1.5-1.5V13"/><circle cx="6.3" cy="16" r="1.8"/><circle cx="13.7" cy="16" r="1.8"/>',
  bike:
    '<circle cx="5.5" cy="15" r="3"/><circle cx="16.5" cy="15" r="3"/><path d="M5.5 15l3.5-5h4l2.5 5"/><path d="M9 10h3.5"/>',
}

/** Returns a full <svg> string for a vehicle type, stroked in currentColor. */
export function markerSVG(type: Vehicle['type']): string {
  return (
    `<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_SHAPES[type]}</svg>`
  )
}
