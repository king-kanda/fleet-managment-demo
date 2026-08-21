import type { AppState, Driver, LngLat, Trip, Vehicle } from '@/lib/types'
import { buildRoute, routeLengthKm } from '@/lib/geo'
import { buildSeedConversations } from './conversations'

// Demo fleet operates across several counties in south-central Kenya. The map
// centre sits between Nairobi and Kiambu so the whole spread is visible.
export const MAP_CENTER: LngLat = [36.95, -1.05]
export const MAP_ZOOM = 8.2

// Towns across Nairobi, Kiambu, Machakos, Kajiado, Murang'a and Nakuru counties,
// used as trip endpoints and idle parking spots.
const PLACES: Record<string, LngLat> = {
  // Nairobi County
  'Nairobi CBD': [36.8219, -1.2864],
  Westlands: [36.8065, -1.2649],
  Embakasi: [36.8944, -1.3089],
  Karen: [36.7073, -1.3197],
  'JKIA Airport': [36.9278, -1.3192],
  // Kiambu County
  Thika: [37.0693, -1.0333],
  Ruiru: [36.9580, -1.1450],
  'Kiambu Town': [36.8356, -1.1714],
  Limuru: [36.6420, -1.1136],
  Juja: [37.0110, -1.1030],
  // Machakos County
  'Machakos Town': [37.2634, -1.5177],
  'Athi River': [36.9784, -1.4560],
  // Kajiado County
  Kitengela: [36.9575, -1.4778],
  Ngong: [36.6560, -1.3606],
  Kajiado: [36.7820, -1.8523],
  // Murang'a County
  "Murang'a": [37.1500, -0.7210],
  // Nakuru County
  Naivasha: [36.4310, -0.7167],
}

const placeNames = Object.keys(PLACES)
const rnd = () => Math.random()
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
function randomPlace(exclude?: string): string {
  let p = pick(placeNames)
  while (p === exclude) p = pick(placeNames)
  return p
}

const DRIVER_COLORS = ['#4f46e5', '#0f9d63', '#c77700', '#7c5cf0', '#d64545', '#0891b2', '#db2777', '#ca8a04', '#2563eb', '#059669']

const FIRST_NAMES = [
  'James', 'Aisha', 'Peter', 'Grace', 'David', 'Fatuma', 'Samuel', 'Lucy', 'John', 'Mary',
  'Brian', 'Faith', 'Kevin', 'Joyce', 'Dennis', 'Mercy', 'Paul', 'Esther', 'Michael', 'Ann',
  'Daniel', 'Susan', 'George', 'Caroline', 'Anthony', 'Jane', 'Charles', 'Rose', 'Stephen', 'Nancy',
  'Victor', 'Beatrice', 'Collins', 'Winnie', 'Felix', 'Sharon', 'Edwin', 'Purity', 'Ali', 'Halima',
]
const LAST_NAMES = [
  'Mwangi', 'Otieno', 'Kamau', 'Wanjiru', 'Kiprop', 'Hassan', 'Njoroge', 'Achieng', 'Ochieng', 'Wafula',
  'Mutua', 'Chebet', 'Omondi', 'Njeri', 'Kimani', 'Adhiambo', 'Barasa', 'Cheruiyot', 'Maina', 'Owino',
  'Muthoni', 'Kariuki', 'Auma', 'Rotich', 'Gitau', 'Nyambura', 'Onyango', 'Wambui', 'Kirui', 'Abdi',
]

const FLEET_SIZE = 100
const MOVING_COUNT = 32 // vehicles actively on trips

type VType = Vehicle['type']
const TYPE_PLAN: Array<{ type: VType; prefix: string; count: number }> = [
  { type: 'truck', prefix: 'Truck', count: 40 },
  { type: 'van', prefix: 'Van', count: 30 },
  { type: 'car', prefix: 'Car', count: 20 },
  { type: 'bike', prefix: 'Bike', count: 10 },
]

function plate(type: VType, n: number): string {
  const L = () => String.fromCharCode(65 + Math.floor(rnd() * 26))
  const d = () => Math.floor(rnd() * 10)
  if (type === 'bike') return `KM${L()}${L()} ${d()}${d()}${String.fromCharCode(65 + (n % 26))}`
  return `K${L()}${L()} ${d()}${d()}${d()}${String.fromCharCode(65 + (n % 26))}`
}

function jitter(coord: LngLat, amount = 0.02): LngLat {
  return [coord[0] + (rnd() - 0.5) * amount, coord[1] + (rnd() - 0.5) * amount]
}

function makeDrivers(n: number): Driver[] {
  const used = new Set<string>()
  const drivers: Driver[] = []
  for (let i = 0; i < n; i++) {
    let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    let guard = 0
    while (used.has(name) && guard++ < 20) name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    used.add(name)
    drivers.push({
      id: `drv-${i + 1}`,
      name,
      phone: `+2547${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
      avatarColor: DRIVER_COLORS[i % DRIVER_COLORS.length],
      status: 'off_duty',
      vehicleId: null,
      rating: Math.round((3.8 + rnd() * 1.2) * 10) / 10,
    })
  }
  return drivers
}

const CARGO = ['Electronics', 'Fresh produce', 'Parcels', 'Building materials', 'Medical supplies', 'Retail stock', 'Furniture', 'Beverages', 'Textiles', 'Auto parts']

export function buildSeedState(): AppState {
  const drivers = makeDrivers(FLEET_SIZE)
  const vehicles: Vehicle[] = []
  const trips: Trip[] = []

  // Flatten the type plan into a naming sequence.
  const defs: Array<{ type: VType; name: string }> = []
  TYPE_PLAN.forEach(({ type, prefix, count }) => {
    for (let i = 1; i <= count; i++) defs.push({ type, name: `${prefix} ${String(i).padStart(2, '0')}` })
  })

  defs.forEach((def, i) => {
    const driver = drivers[i]
    const moving = i < MOVING_COUNT
    // Remaining split across idle / maintenance / offline.
    let status: Vehicle['status']
    if (moving) status = 'moving'
    else {
      const r = (i - MOVING_COUNT) % 10
      status = r < 6 ? 'idle' : r < 8 ? 'offline' : 'maintenance'
    }

    const originName = randomPlace()
    const destName = randomPlace(originName)
    const origin = PLACES[originName]
    const dest = PLACES[destName]
    const route = moving ? buildRoute(origin, dest) : []
    const progress = moving ? rnd() * 0.7 : 0

    // Only one vehicle in the whole fleet has a fuel-telemetry device installed.
    const hasFuelSensor = i === 0

    const vehicle: Vehicle = {
      id: `veh-${i + 1}`,
      name: def.name,
      plate: plate(def.type, i),
      type: def.type,
      driverId: driver.id,
      status,
      position: moving ? origin : jitter(pick(placeNames.map((p) => PLACES[p])), 0.015),
      heading: rnd() * 360,
      speedKph: moving ? 25 + rnd() * 45 : 0,
      hasFuelSensor,
      fuelPct: hasFuelSensor ? Math.round(30 + rnd() * 55) : 0,
      odometerKm: Math.round(20000 + rnd() * 180000),
      route,
      routeProgress: progress,
      activeTripId: null,
    }

    driver.vehicleId = vehicle.id
    driver.status = moving ? 'on_trip' : 'off_duty'

    if (moving) {
      const trip: Trip = {
        id: `trip-${i + 1}`,
        reference: `TR-${1040 + i}`,
        origin: originName,
        destination: destName,
        originCoord: origin,
        destinationCoord: dest,
        vehicleId: vehicle.id,
        driverId: driver.id,
        status: 'in_progress',
        cargo: pick(CARGO),
        distanceKm: Math.round(routeLengthKm(route) * 10) / 10,
        createdAt: Date.now() - Math.floor(rnd() * 3600_000),
        eta: Date.now() + Math.floor((1 - progress) * 45 * 60_000),
        progress,
      }
      vehicle.activeTripId = trip.id
      trips.push(trip)
    }

    vehicles.push(vehicle)
  })

  // Edge case: a trip with an unusually long route label to stress-test truncation.
  trips.push({
    id: 'trip-pending-long',
    reference: 'TR-2049',
    origin: 'JKIA Airport Freight Terminal 2',
    destination: 'Nakuru Regional Distribution Centre',
    originCoord: PLACES['JKIA Airport'],
    destinationCoord: PLACES.Westlands,
    vehicleId: null,
    driverId: null,
    status: 'pending',
    cargo: 'Refrigerated pharmaceutical consignment',
    distanceKm: 162.4,
    createdAt: Date.now() - 240_000,
    eta: null,
    progress: 0,
  })

  // A handful of pending trips waiting for dispatch.
  for (let i = 0; i < 5; i++) {
    const originName = randomPlace()
    const destName = randomPlace(originName)
    trips.push({
      id: `trip-pending-${i + 1}`,
      reference: `TR-${2050 + i}`,
      origin: originName,
      destination: destName,
      originCoord: PLACES[originName],
      destinationCoord: PLACES[destName],
      vehicleId: null,
      driverId: null,
      status: 'pending',
      cargo: pick(CARGO),
      distanceKm: Math.round(routeLengthKm(buildRoute(PLACES[originName], PLACES[destName])) * 10) / 10,
      createdAt: Date.now() - Math.floor(rnd() * 1800_000),
      eta: null,
      progress: 0,
    })
  }

  return {
    vehicles,
    drivers,
    trips,
    alerts: [
      { id: 'alert-seed-1', level: 'critical', title: 'Harsh braking detected', detail: 'Truck 02 — sudden deceleration on Waiyaki Way. Driver notified.', vehicleId: 'veh-2', createdAt: Date.now() - 180_000, read: false },
      { id: 'alert-seed-2', level: 'warning', title: 'Geofence exit', detail: 'Van 03 left the Industrial Area delivery zone.', vehicleId: 'veh-43', createdAt: Date.now() - 600_000, read: false },
      { id: 'alert-seed-3', level: 'warning', title: 'Idle over 20 min', detail: 'Truck 15 has been stationary near CBD for 24 minutes.', vehicleId: 'veh-15', createdAt: Date.now() - 900_000, read: false },
      { id: 'alert-seed-4', level: 'info', title: 'Trip started', detail: 'Truck 01 departed for its destination.', vehicleId: 'veh-1', createdAt: Date.now() - 1_200_000, read: true },
      { id: 'alert-seed-5', level: 'info', title: 'Maintenance due', detail: 'Bike 09 is due for a 10,000 km service in 3 days.', vehicleId: 'veh-99', createdAt: Date.now() - 5_400_000, read: true },
    ],
    // Multi-turn dispatch threads across the first dozen drivers — real history
    // for the inbox, and real context for the AI auto-reply to read back.
    messages: buildSeedConversations(drivers, vehicles, trips),
    settings: {
      mapboxToken: '',
      simulationRunning: true,
      autoReply: true,
      grokApiKey: '',
      grokModel: '',
      aiReplies: true,
    },
  }
}

export { PLACES }
