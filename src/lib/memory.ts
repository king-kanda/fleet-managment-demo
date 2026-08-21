/**
 * Conversation memory.
 *
 * Grok only sees what we hand it, so every driver conversation is condensed into
 * a `ConversationMemory` object: who the driver is, what they are driving, the
 * trip they are on, the alerts raised against their vehicle, durable facts
 * gathered from earlier messages, and a rolling window of the transcript. That
 * object is what gets rendered into the prompt — the model never reads the raw
 * store.
 *
 * Facts survive beyond the transcript window: once a driver tells us the truck
 * pulls to the left, that stays in memory even after the message scrolls out.
 */
import type { AppState, Driver, LngLat, WhatsAppMessage } from './types'
import { haversineKm } from './geo'
import { PLACES } from '@/data/seed'

/** Nearest named place to a coordinate — locations mean more than lng/lat to a model. */
function nearestPlace(pos: LngLat): string {
  let best = ''
  let bestKm = Infinity
  for (const [name, coord] of Object.entries(PLACES) as [string, LngLat][]) {
    const km = haversineKm(pos, coord)
    if (km < bestKm) {
      bestKm = km
      best = name
    }
  }
  return bestKm < 1 ? best : `${best} (${Math.round(bestKm)} km away)`
}

/** How many recent messages are replayed to the model verbatim. */
export const TRANSCRIPT_WINDOW = 14

export interface MemoryFact {
  text: string
  at: number
}

export interface ConversationMemory {
  driverId: string
  driverName: string
  profile: string[]
  vehicle: string[]
  trip: string[]
  alerts: string[]
  facts: MemoryFact[]
  transcript: { role: 'driver' | 'dispatch'; body: string; at: number }[]
  /** Full text handed to the model as the system prompt. */
  prompt: string
}

const FACT_STORAGE_KEY = 'fleetpulse.memory.v1'

// Durable per-driver facts, kept outside the app store so resetting the demo
// fleet doesn't have to migrate them and vice versa.
type FactBook = Record<string, MemoryFact[]>

function loadFacts(): FactBook {
  try {
    const raw = localStorage.getItem(FACT_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as FactBook
  } catch {
    // Unavailable or corrupt storage — memory just starts empty this session.
  }
  return {}
}

let factBook: FactBook = loadFacts()

function persistFacts() {
  try {
    localStorage.setItem(FACT_STORAGE_KEY, JSON.stringify(factBook))
  } catch {
    // Ignore quota errors — facts stay in memory for this session.
  }
}

export function clearMemory(driverId?: string) {
  factBook = driverId ? { ...factBook, [driverId]: [] } : {}
  persistFacts()
}

export function getFacts(driverId: string): MemoryFact[] {
  return factBook[driverId] ?? []
}

/**
 * Pull durable facts out of an inbound message. Deliberately a small set of
 * patterns rather than an LLM call: it runs on every message, offline, and its
 * output is auditable in the Memory panel.
 */
const FACT_PATTERNS: { re: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { re: /\b(?:puncture|flat tyre|flat tire|burst)\b/i, label: () => 'Reported a tyre problem' },
  { re: /\b(?:accident|collision|hit|crash)\b/i, label: () => 'Reported an incident on the road' },
  { re: /\b(?:police|checkpoint|roadblock)\b/i, label: () => 'Stopped at a police checkpoint' },
  { re: /\b(?:sick|unwell|fever|hospital|clinic)\b/i, label: () => 'Reported feeling unwell' },
  { re: /\b(?:brake|brakes|engine|clutch|gearbox|overheat\w*|warning light)\b/i, label: (m) => `Reported a mechanical issue (${m[0].toLowerCase()})` },
  { re: /\b(?:rain|flood\w*|mud|storm)\b/i, label: () => 'Reported bad weather affecting the route' },
  { re: /\b(?:fuel|diesel|petrol)\b.*\b(?:low|empty|refuel|fill)\b/i, label: () => 'Needed to refuel' },
  { re: /\b(?:late|delay\w*|traffic|jam)\b/i, label: () => 'Reported a delay in traffic' },
  { re: /\b(?:offload\w*|loading|unload\w*)\b.*\b(?:slow|waiting|queue|delay\w*)\b/i, label: () => 'Waiting on loading/offloading at a site' },
  { re: /\b(?:leave|off duty|day off|family|funeral|wedding)\b/i, label: () => 'Raised a personal scheduling request' },
]

export function rememberFrom(driverId: string, body: string, at = Date.now()) {
  const existing = factBook[driverId] ?? []
  const found: MemoryFact[] = []
  for (const p of FACT_PATTERNS) {
    const m = body.match(p.re)
    if (!m) continue
    const text = p.label(m)
    if (existing.some((f) => f.text === text) || found.some((f) => f.text === text)) continue
    found.push({ text, at })
  }
  if (!found.length) return
  // Keep the most recent 12 facts per driver — enough context, bounded prompt.
  factBook = { ...factBook, [driverId]: [...existing, ...found].slice(-12) }
  persistFacts()
}

function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** Assemble everything the model should know about one driver conversation. */
export function buildMemory(s: AppState, driverId: string): ConversationMemory | null {
  const driver: Driver | undefined = s.drivers.find((d) => d.id === driverId)
  if (!driver) return null

  const vehicle = s.vehicles.find((v) => v.id === driver.vehicleId)
  const trip = s.trips.find((t) => t.id === vehicle?.activeTripId)
  const messages = s.messages.filter((m) => m.driverId === driverId)

  const profile = [
    `Name: ${driver.name} (address them by first name)`,
    `WhatsApp: ${driver.phone}`,
    `Duty status: ${driver.status.replace('_', ' ')}`,
    `Driver rating: ${driver.rating.toFixed(1)} / 5`,
  ]

  const vehicleLines = vehicle
    ? [
        `Assigned vehicle: ${vehicle.name} (${vehicle.plate}), a ${vehicle.type}`,
        `Vehicle status: ${vehicle.status}, currently ${Math.round(vehicle.speedKph)} km/h`,
        `Last known location: near ${nearestPlace(vehicle.position)}`,
        vehicle.hasFuelSensor
          ? `Fuel level: ${Math.round(vehicle.fuelPct)}%`
          : 'Fuel level: no fuel sensor fitted on this vehicle — do not quote a fuel figure',
        `Odometer: ${Math.round(vehicle.odometerKm).toLocaleString()} km`,
      ]
    : ['No vehicle is currently assigned to this driver.']

  const tripLines = trip
    ? [
        `Active trip ${trip.reference}: ${trip.origin} → ${trip.destination}`,
        `Cargo: ${trip.cargo}`,
        `Distance: ${trip.distanceKm} km, ${Math.round(trip.progress * 100)}% complete`,
        trip.eta
          ? `ETA: ${new Date(trip.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (about ${Math.max(0, Math.round((trip.eta - Date.now()) / 60_000))} min away)`
          : 'ETA: not yet calculated',
      ]
    : ['No active trip. The driver is waiting for dispatch.']

  const alerts = s.alerts
    .filter((a) => a.vehicleId && a.vehicleId === vehicle?.id)
    .slice(0, 4)
    .map((a) => `${a.level.toUpperCase()}: ${a.title} — ${a.detail} (${timeAgo(a.createdAt)})`)

  const facts = getFacts(driverId)

  const transcript = messages.slice(-TRANSCRIPT_WINDOW).map((m: WhatsAppMessage) => ({
    role: m.direction === 'inbound' ? ('driver' as const) : ('dispatch' as const),
    body: m.body,
    at: m.createdAt,
  }))

  const section = (title: string, lines: string[]) =>
    lines.length ? `${title}\n${lines.map((l) => `- ${l}`).join('\n')}` : ''

  const prompt = [
    section('DRIVER', profile),
    section('VEHICLE', vehicleLines),
    section('TRIP', tripLines),
    section('OPEN ALERTS ON THIS VEHICLE', alerts),
    section('REMEMBERED FROM EARLIER CONVERSATIONS', facts.map((f) => `${f.text} (${timeAgo(f.at)})`)),
    section(
      'RECENT CONVERSATION',
      transcript.map((t) => `${t.role === 'driver' ? driver.name.split(' ')[0] : 'Dispatch'}: ${t.body}`),
    ),
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    driverId,
    driverName: driver.name,
    profile,
    vehicle: vehicleLines,
    trip: tripLines,
    alerts,
    facts,
    transcript,
    prompt,
  }
}
