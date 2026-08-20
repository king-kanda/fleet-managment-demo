import { store } from './store'
import { completeTrip, pushAlert, receiveMessage } from './actions'
import { pointAlongRoute } from './geo'
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

      // Speed → fraction of route per tick. Routes are ~10-25km; scale so a
      // trip takes a couple of minutes of wall-clock for a lively demo.
      const step = (v.speedKph / 3600) * (TICK_MS / 1000) * 0.9
      let progress = v.routeProgress + step / Math.max(1, routeSpanFactor(v.route.length))
      const jitteredSpeed = Math.max(8, Math.min(90, v.speedKph + (Math.random() - 0.5) * 6))
      const fuelPct = Math.max(0, v.fuelPct - 0.05 - Math.random() * 0.05)

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
        odometerKm: Math.round((v.odometerKm + step * 0.2) * 10) / 10,
      }
    })

    // Sync trip progress + ETA from their vehicles.
    const trips = prev.trips.map((t) => {
      if (t.status !== 'in_progress') return t
      const v = vehicles.find((veh) => veh.id === t.vehicleId)
      if (!v) return t
      const remaining = 1 - v.routeProgress
      return {
        ...t,
        progress: v.routeProgress,
        eta: Date.now() + Math.round(remaining * 30 * 60_000),
      }
    })

    return { ...prev, vehicles, trips }
  })

  // Handle side effects (completions, alerts) outside the main state map.
  completedTripIds.forEach((id) => completeTrip(id))

  maybeFireEvents(store.getState())
}

// Longer routes (more waypoints) should take proportionally longer.
function routeSpanFactor(waypointCount: number): number {
  return Math.max(0.15, waypointCount * 0.04)
}

let lowFuelWarned = new Set<string>()

function maybeFireEvents(s: AppState) {
  // Low-fuel alerts, once per vehicle until refuel.
  s.vehicles.forEach((v) => {
    if (v.fuelPct < 20 && !lowFuelWarned.has(v.id)) {
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
