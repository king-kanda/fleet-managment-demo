import { store } from './store'
import type { Alert, AppState, Driver, Trip, Vehicle, WhatsAppMessage } from './types'
import { buildRoute, routeLengthKm } from './geo'
import { MAP_CENTER } from '@/data/seed'

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// ---------------------------------------------------------------------------
// Fleet (vehicle) management
// ---------------------------------------------------------------------------

export type VehicleInput = Pick<Vehicle, 'name' | 'plate' | 'type' | 'fuelPct' | 'hasFuelSensor'> & { driverId: string | null }

export function addVehicle(input: VehicleInput) {
  const vehicle: Vehicle = {
    id: uid('veh'),
    name: input.name,
    plate: input.plate,
    type: input.type,
    driverId: input.driverId,
    status: 'idle',
    position: [MAP_CENTER[0] + (Math.random() - 0.5) * 0.03, MAP_CENTER[1] + (Math.random() - 0.5) * 0.03],
    heading: 0,
    speedKph: 0,
    hasFuelSensor: input.hasFuelSensor,
    fuelPct: input.hasFuelSensor ? input.fuelPct : 0,
    odometerKm: 0,
    route: [],
    routeProgress: 0,
    activeTripId: null,
  }
  store.update((s) => {
    const drivers = input.driverId
      ? s.drivers.map((d) => (d.id === input.driverId ? { ...d, vehicleId: vehicle.id } : d))
      : s.drivers
    return { ...s, vehicles: [...s.vehicles, vehicle], drivers }
  })
  return vehicle
}

export function updateVehicle(id: string, input: VehicleInput) {
  store.update((s) => {
    const prev = s.vehicles.find((v) => v.id === id)
    const vehicles = s.vehicles.map((v) => (v.id === id ? { ...v, ...input } : v))
    // Reassign driver links if the driver changed.
    let drivers = s.drivers
    if (prev && prev.driverId !== input.driverId) {
      drivers = s.drivers.map((d) => {
        if (d.id === prev.driverId) return { ...d, vehicleId: null }
        if (d.id === input.driverId) return { ...d, vehicleId: id }
        return d
      })
    }
    return { ...s, vehicles, drivers }
  })
}

export function deleteVehicle(id: string) {
  store.update((s) => {
    const vehicle = s.vehicles.find((v) => v.id === id)
    return {
      ...s,
      vehicles: s.vehicles.filter((v) => v.id !== id),
      drivers: s.drivers.map((d) => (d.vehicleId === id ? { ...d, vehicleId: null, status: 'off_duty' as const } : d)),
      trips: s.trips.map((t) =>
        t.vehicleId === id && (t.status === 'in_progress' || t.status === 'assigned')
          ? { ...t, status: 'cancelled' as const, vehicleId: null, driverId: null }
          : t,
      ),
      alerts: vehicle
        ? [{ id: uid('alert'), level: 'info' as const, title: 'Vehicle removed', detail: `${vehicle.name} was removed from the fleet.`, vehicleId: null, createdAt: Date.now(), read: false }, ...s.alerts]
        : s.alerts,
    }
  })
}

// ---------------------------------------------------------------------------
// Driver management
// ---------------------------------------------------------------------------

const DRIVER_COLORS = ['#4f46e5', '#0f9d63', '#c77700', '#7c5cf0', '#d64545', '#0891b2', '#db2777', '#ca8a04']

export type DriverInput = Pick<Driver, 'name' | 'phone' | 'rating'>

export function addDriver(input: DriverInput) {
  const driver: Driver = {
    id: uid('drv'),
    name: input.name,
    phone: input.phone,
    avatarColor: DRIVER_COLORS[Math.floor(Math.random() * DRIVER_COLORS.length)],
    status: 'available',
    vehicleId: null,
    rating: input.rating,
  }
  store.update((s) => ({ ...s, drivers: [...s.drivers, driver] }))
  return driver
}

export function updateDriver(id: string, input: DriverInput) {
  store.update((s) => ({
    ...s,
    drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...input } : d)),
  }))
}

export function deleteDriver(id: string) {
  store.update((s) => ({
    ...s,
    drivers: s.drivers.filter((d) => d.id !== id),
    vehicles: s.vehicles.map((v) => (v.driverId === id ? { ...v, driverId: null } : v)),
  }))
}

export function pushAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'read'>) {
  store.update((s) => ({
    ...s,
    alerts: [{ ...alert, id: uid('alert'), createdAt: Date.now(), read: false }, ...s.alerts].slice(0, 100),
  }))
}

export function markAlertsRead() {
  store.update((s) => ({ ...s, alerts: s.alerts.map((a) => ({ ...a, read: true })) }))
}

export function toggleSimulation() {
  store.update((s) => ({ ...s, settings: { ...s.settings, simulationRunning: !s.settings.simulationRunning } }))
}

export function toggleAutoReply() {
  store.update((s) => ({ ...s, settings: { ...s.settings, autoReply: !s.settings.autoReply } }))
}

export function setMapboxToken(token: string) {
  store.update((s) => ({ ...s, settings: { ...s.settings, mapboxToken: token.trim() } }))
}

export function resetDemo() {
  store.reset()
}

/** Assign a pending trip to a vehicle + its driver and start the route. */
export function assignTrip(tripId: string, vehicleId: string) {
  store.update((s) => {
    const trip = s.trips.find((t) => t.id === tripId)
    const vehicle = s.vehicles.find((v) => v.id === vehicleId)
    if (!trip || !vehicle) return s

    const route = buildRoute(trip.originCoord, trip.destinationCoord)
    const distanceKm = Math.round(routeLengthKm(route) * 10) / 10

    const vehicles = s.vehicles.map((v) =>
      v.id === vehicleId
        ? {
            ...v,
            status: 'moving' as const,
            route,
            routeProgress: 0,
            position: trip.originCoord,
            speedKph: 35,
            activeTripId: trip.id,
          }
        : v,
    )
    const drivers = s.drivers.map((d) =>
      d.id === vehicle.driverId ? { ...d, status: 'on_trip' as const } : d,
    )
    const trips = s.trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            status: 'in_progress' as const,
            vehicleId,
            driverId: vehicle.driverId,
            distanceKm,
            eta: Date.now() + 40 * 60_000,
            progress: 0,
          }
        : t,
    )
    return { ...s, vehicles, drivers, trips }
  })

  const s = store.getState()
  const trip = s.trips.find((t) => t.id === tripId)
  const vehicle = s.vehicles.find((v) => v.id === vehicleId)
  if (trip && vehicle?.driverId) {
    sendMessage(vehicle.driverId, `New trip ${trip.reference}: ${trip.origin} → ${trip.destination}. Cargo: ${trip.cargo}. Please confirm.`, { automated: true })
    pushAlert({ level: 'info', title: 'Trip dispatched', detail: `${trip.reference} assigned to ${vehicle.name}.`, vehicleId })
  }
}

export function createTrip(input: {
  origin: string
  destination: string
  originCoord: [number, number]
  destinationCoord: [number, number]
  cargo: string
}): Trip {
  const route = buildRoute(input.originCoord, input.destinationCoord)
  const trip: Trip = {
    id: uid('trip'),
    reference: `TR-${1000 + Math.floor(Math.random() * 9000)}`,
    origin: input.origin,
    destination: input.destination,
    originCoord: input.originCoord,
    destinationCoord: input.destinationCoord,
    vehicleId: null,
    driverId: null,
    status: 'pending',
    cargo: input.cargo,
    distanceKm: Math.round(routeLengthKm(route) * 10) / 10,
    createdAt: Date.now(),
    eta: null,
    progress: 0,
  }
  store.update((s) => ({ ...s, trips: [trip, ...s.trips] }))
  return trip
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/**
 * Append a message to a driver conversation. Outbound messages are what a
 * dispatcher (or the automated bot) sends; use `receiveMessage` for inbound.
 *
 * In a production build this is where the WhatsApp Business Cloud API call
 * would go — see src/lib/whatsapp.ts for the stubbed wiring.
 */
export function sendMessage(driverId: string, body: string, opts?: { automated?: boolean }): WhatsAppMessage {
  const msg: WhatsAppMessage = {
    id: uid('msg'),
    driverId,
    direction: 'outbound',
    body,
    createdAt: Date.now(),
    status: 'sent',
    automated: opts?.automated,
  }
  store.update((s) => ({ ...s, messages: [...s.messages, msg] }))
  // Simulate delivery + read receipts.
  setTimeout(() => updateMessageStatus(msg.id, 'delivered'), 800)
  setTimeout(() => updateMessageStatus(msg.id, 'read'), 2200)
  return msg
}

function updateMessageStatus(id: string, status: WhatsAppMessage['status']) {
  store.update((s) => ({
    ...s,
    messages: s.messages.map((m) => (m.id === id ? { ...m, status } : m)),
  }))
}

/** Record an inbound message from a driver and, if enabled, run the auto-reply bot. */
export function receiveMessage(driverId: string, body: string) {
  const msg: WhatsAppMessage = {
    id: uid('msg'),
    driverId,
    direction: 'inbound',
    body,
    createdAt: Date.now(),
    status: 'read',
  }
  store.update((s) => ({ ...s, messages: [...s.messages, msg] }))

  if (store.getState().settings.autoReply) {
    const reply = botReply(store.getState(), driverId, body)
    if (reply) setTimeout(() => sendMessage(driverId, reply, { automated: true }), 1200)
  }
}

/**
 * A small command parser standing in for a WhatsApp chatbot. Drivers can text
 * simple keywords to interact with dispatch without a phone call.
 */
export function botReply(s: AppState, driverId: string, body: string): string | null {
  const text = body.trim().toLowerCase()
  const driver = s.drivers.find((d) => d.id === driverId)
  const vehicle = s.vehicles.find((v) => v.id === driver?.vehicleId)
  const trip = s.trips.find((t) => t.id === vehicle?.activeTripId)

  if (/^(hi|hello|hey|menu|help)\b/.test(text)) {
    return 'FleetPulse dispatch 🤖 Reply with:\n• STATUS – your current trip\n• ETA – estimated arrival\n• FUEL – fuel level\n• ARRIVED – mark trip complete\n• BREAK – log a rest stop'
  }
  if (text.includes('status')) {
    if (!trip) return 'You have no active trip right now. Standby for dispatch.'
    return `Trip ${trip.reference}: ${trip.origin} → ${trip.destination}. ${Math.round(trip.progress * 100)}% complete. Cargo: ${trip.cargo}.`
  }
  if (text.includes('eta')) {
    if (!trip?.eta) return 'No ETA available — no active trip.'
    const mins = Math.max(0, Math.round((trip.eta - Date.now()) / 60_000))
    return `Estimated arrival at ${trip.destination} in about ${mins} min.`
  }
  if (text.includes('fuel')) {
    if (!vehicle) return 'No vehicle assigned.'
    return `${vehicle.name} fuel level is ${vehicle.fuelPct}%.`
  }
  if (text.includes('arrived') || text.includes('done') || text.includes('complete')) {
    if (trip) {
      completeTrip(trip.id)
      return `Trip ${trip.reference} marked as completed. Great work! 🎉`
    }
    return 'No active trip to complete.'
  }
  if (text.includes('break') || text.includes('rest')) {
    return 'Rest stop logged. Take your time and stay safe. 🛑'
  }
  return "Sorry, I didn't catch that. Reply MENU for options."
}

export function completeTrip(tripId: string) {
  store.update((s) => {
    const trip = s.trips.find((t) => t.id === tripId)
    if (!trip) return s
    const trips = s.trips.map((t) => (t.id === tripId ? { ...t, status: 'completed' as const, progress: 1 } : t))
    const vehicles = s.vehicles.map((v) =>
      v.id === trip.vehicleId
        ? { ...v, status: 'idle' as const, speedKph: 0, route: [], activeTripId: null, routeProgress: 0 }
        : v,
    )
    const drivers = s.drivers.map((d) =>
      d.id === trip.driverId ? { ...d, status: 'available' as const } : d,
    )
    return { ...s, trips, vehicles, drivers }
  })
  const s = store.getState()
  const trip = s.trips.find((t) => t.id === tripId)
  if (trip) pushAlert({ level: 'info', title: 'Trip completed', detail: `${trip.reference} delivered to ${trip.destination}.`, vehicleId: trip.vehicleId })
}
