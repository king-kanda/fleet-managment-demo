import { store } from './store'
import { completeTrip, pushAlert, receiveMessage } from './actions'
import { pointAlongRoute, routeLengthKm } from './geo'
import type { AppState } from './types'

// Canned inbound driver messages the simulator occasionally fires so the
// WhatsApp inbox feels alive.
const DRIVER_CHATTER = [
  'On my way, all good here.',
  'Traffic building up near the roundabout.',
  'Just passed the checkpoint.',
  'STATUS',
  'ETA',
  'Customer called, confirming delivery window.',
  'Fuel getting a bit low, will top up after this drop.',
  'BREAK',
]

const TICK_MS = 1000

/**
 * Advances the world one tick: moves vehicles along their routes, drains fuel,
 * updates trip progress/ETA, fires the odd alert, and injects driver chatter.
 * Pure-ish: reads current state and produces the next one via store.update.
 */
function tick() {
  const s = store.getState()
  if (!s.settings.simulationRunning) return

  const completedTripIds: string[] = []

  store.update((prev: AppState) => {
    const vehicles = prev.vehicles.map((v) => {
      if (v.status !== 'moving' || v.route.length < 2) return v

      // Real-time movement: advance by the actual distance covered this tick at
      // the vehicle's real speed, so a "30 min" ETA is a real 30 minutes.
      const routeLen = Math.max(0.1, routeLengthKm(v.route))
      const distanceStepKm = (v.speedKph / 3600) * (TICK_MS / 1000)
      let progress = v.routeProgress + distanceStepKm / routeLen
      const jitteredSpeed = Math.max(8, Math.min(90, v.speedKph + (Math.random() - 0.5) * 6))
      // Fuel only changes on vehicles that actually have a telemetry device.
      const fuelPct = v.hasFuelSensor ? Math.max(0, v.fuelPct - 0.002 - Math.random() * 0.002) : v.fuelPct

      if (progress >= 1) {
        progress = 1
        if (v.activeTripId) completedTripIds.push(v.activeTripId)
      }

      const { point, heading } = pointAlongRoute(v.route, progress)
      return {
        ...v,
        position: point,
        heading,
        routeProgress: progress,
        speedKph: progress >= 1 ? 0 : jitteredSpeed,
        fuelPct: Math.round(fuelPct * 10) / 10,
        odometerKm: Math.round((v.odometerKm + distanceStepKm) * 10) / 10,
      }
    })

    // Sync trip progress + ETA from their vehicles, in real minutes.
    const trips = prev.trips.map((t) => {
      if (t.status !== 'in_progress') return t
      const v = vehicles.find((veh) => veh.id === t.vehicleId)
      if (!v) return t
      const routeLen = Math.max(0.1, routeLengthKm(v.route))
      const remainingKm = (1 - v.routeProgress) * routeLen
      const speed = Math.max(8, v.speedKph)
      const etaMs = (remainingKm / speed) * 3600 * 1000
      return {
        ...t,
        progress: v.routeProgress,
        eta: Date.now() + Math.round(etaMs),
      }
    })

    return { ...prev, vehicles, trips }
  })

  // Handle side effects (completions, alerts) outside the main state map.
  completedTripIds.forEach((id) => completeTrip(id))

  maybeFireEvents(store.getState())
}

let lowFuelWarned = new Set<string>()

function maybeFireEvents(s: AppState) {
  // Low-fuel alerts, once per vehicle until refuel — only where a sensor exists.
  s.vehicles.forEach((v) => {
    if (v.hasFuelSensor && v.fuelPct < 20 && !lowFuelWarned.has(v.id)) {
      lowFuelWarned.add(v.id)
      pushAlert({ level: 'warning', title: 'Low fuel', detail: `${v.name} fuel at ${Math.round(v.fuelPct)}%.`, vehicleId: v.id })
    }
    if (v.fuelPct > 40) lowFuelWarned.delete(v.id)
  })

  // Occasional inbound driver chatter (~ every ~12s on average per active driver).
  if (Math.random() < 0.06) {
    const onTrip = s.drivers.filter((d) => d.status === 'on_trip')
    if (onTrip.length) {
      const driver = onTrip[Math.floor(Math.random() * onTrip.length)]
      const body = DRIVER_CHATTER[Math.floor(Math.random() * DRIVER_CHATTER.length)]
      receiveMessage(driver.id, body)
    }
  }
}

let handle: number | null = null

export function startSimulation() {
  if (handle !== null) return
  lowFuelWarned = new Set()
  handle = window.setInterval(tick, TICK_MS)
}

export function stopSimulation() {
  if (handle !== null) {
    window.clearInterval(handle)
    handle = null
  }
}
