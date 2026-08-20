import type { LngLat } from './types'

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** Great-circle distance in kilometres between two lng/lat points. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s))
}

/** Compass bearing (degrees, 0 = north) from point a to point b. */
export function bearing(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Total length of a polyline in kilometres. */
export function routeLengthKm(route: LngLat[]): number {
  let total = 0
  for (let i = 1; i < route.length; i++) total += haversineKm(route[i - 1], route[i])
  return total
}

/**
 * Interpolate a position along a polyline at fractional progress t (0..1).
 * Returns the point plus the heading at that point.
 */
export function pointAlongRoute(route: LngLat[], t: number): { point: LngLat; heading: number } {
  if (route.length === 0) return { point: [0, 0], heading: 0 }
  if (route.length === 1) return { point: route[0], heading: 0 }

  const clamped = Math.max(0, Math.min(1, t))
  const total = routeLengthKm(route)
  const target = total * clamped

  let acc = 0
  for (let i = 1; i < route.length; i++) {
    const segLen = haversineKm(route[i - 1], route[i])
    if (acc + segLen >= target || i === route.length - 1) {
      const segT = segLen === 0 ? 0 : (target - acc) / segLen
      const [lng1, lat1] = route[i - 1]
      const [lng2, lat2] = route[i]
      const point: LngLat = [lng1 + (lng2 - lng1) * segT, lat1 + (lat2 - lat1) * segT]
      return { point, heading: bearing(route[i - 1], route[i]) }
    }
    acc += segLen
  }
  return { point: route[route.length - 1], heading: 0 }
}

/** Build a jittered multi-point route between two coords so vehicles don't travel in dead-straight lines. */
export function buildRoute(from: LngLat, to: LngLat, segments = 6): LngLat[] {
  const route: LngLat[] = [from]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const lng = from[0] + (to[0] - from[0]) * t
    const lat = from[1] + (to[1] - from[1]) * t
    // Perpendicular jitter, tapering to 0 at the endpoints.
    const wobble = Math.sin(t * Math.PI) * 0.012 * (Math.random() - 0.5)
    route.push([lng + wobble, lat + wobble])
  }
  route.push(to)
  return route
}
