import type { AppState, Driver, LngLat, Trip, Vehicle } from '@/lib/types'
import { buildRoute, routeLengthKm } from '@/lib/geo'

// Demo fleet operates around Nairobi, Kenya.
export const MAP_CENTER: LngLat = [36.8219, -1.2921]

// A few recognisable landmarks used as trip endpoints.
const PLACES: Record<string, LngLat> = {
  CBD: [36.8219, -1.2864],
  Westlands: [36.8065, -1.2649],
  'JKIA Airport': [36.9278, -1.3192],
  Karen: [36.7073, -1.3197],
  'Industrial Area': [36.8489, -1.3084],
  Ruaraka: [36.8686, -1.2437],
  Kasarani: [36.8969, -1.2216],
  'Ngong Road': [36.7676, -1.3009],
  Gigiri: [36.8155, -1.2318],
  Embakasi: [36.8944, -1.3089],
}

const placeNames = Object.keys(PLACES)

function randomPlace(exclude?: string): string {
  let p = placeNames[Math.floor(Math.random() * placeNames.length)]
  while (p === exclude) p = placeNames[Math.floor(Math.random() * placeNames.length)]
  return p
}

const DRIVER_COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#ec4899']

const DRIVER_NAMES = [
  'James Mwangi',
  'Aisha Otieno',
  'Peter Kamau',
  'Grace Wanjiru',
  'David Kiprop',
  'Fatuma Hassan',
  'Samuel Njoroge',
  'Lucy Achieng',
]

function makeDrivers(): Driver[] {
  return DRIVER_NAMES.map((name, i) => ({
    id: `drv-${i + 1}`,
    name,
    phone: `+2547${(10000000 + i * 111111).toString().slice(0, 8)}`,
    avatarColor: DRIVER_COLORS[i % DRIVER_COLORS.length],
    status: 'available',
    vehicleId: null,
    rating: Math.round((4 + Math.random()) * 10) / 10,
  }))
}

const VEHICLE_DEFS: Array<{ name: string; plate: string; type: Vehicle['type'] }> = [
  { name: 'Truck 01', plate: 'KDA 128X', type: 'truck' },
  { name: 'Truck 02', plate: 'KDB 774Y', type: 'truck' },
  { name: 'Van 01', plate: 'KCX 411A', type: 'van' },
  { name: 'Van 02', plate: 'KCZ 902B', type: 'van' },
  { name: 'Car 01', plate: 'KDG 335C', type: 'car' },
  { name: 'Car 02', plate: 'KDH 118D', type: 'car' },
  { name: 'Bike 01', plate: 'KMEA 55E', type: 'bike' },
  { name: 'Bike 02', plate: 'KMFB 90F', type: 'bike' },
]

function jitter(coord: LngLat, amount = 0.01): LngLat {
  return [coord[0] + (Math.random() - 0.5) * amount, coord[1] + (Math.random() - 0.5) * amount]
}

export function buildSeedState(): AppState {
  const drivers = makeDrivers()
  const vehicles: Vehicle[] = []
  const trips: Trip[] = []

  VEHICLE_DEFS.forEach((def, i) => {
    const driver = drivers[i]
    const originName = randomPlace()
    const destName = randomPlace(originName)
    const origin = PLACES[originName]
    const dest = PLACES[destName]
    const route = buildRoute(origin, dest)

    // First 5 vehicles are actively on trips, the rest idle/offline.
    const active = i < 5
    const status: Vehicle['status'] = active ? 'moving' : i === 5 ? 'idle' : i === 6 ? 'maintenance' : 'offline'
    const progress = active ? Math.random() * 0.6 : 0

    const vehicle: Vehicle = {
      id: `veh-${i + 1}`,
      name: def.name,
      plate: def.plate,
      type: def.type,
      driverId: driver.id,
      status,
      position: active ? origin : jitter(PLACES.CBD, 0.03),
      heading: Math.random() * 360,
      speedKph: active ? 30 + Math.random() * 40 : 0,
      fuelPct: Math.round(25 + Math.random() * 70),
      odometerKm: Math.round(40000 + Math.random() * 120000),
      route: active ? route : [],
      routeProgress: progress,
      activeTripId: null,
    }

    driver.vehicleId = vehicle.id
    driver.status = active ? 'on_trip' : 'off_duty'

    if (active) {
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
        cargo: ['Electronics', 'Fresh produce', 'Parcels', 'Building materials', 'Medical supplies'][i % 5],
        distanceKm: Math.round(routeLengthKm(route) * 10) / 10,
        createdAt: Date.now() - Math.floor(Math.random() * 3600_000),
        eta: Date.now() + Math.floor((1 - progress) * 45 * 60_000),
        progress,
      }
      vehicle.activeTripId = trip.id
      trips.push(trip)
    }

    vehicles.push(vehicle)
  })

  // A couple of pending trips waiting for dispatch.
  for (let i = 0; i < 2; i++) {
    const originName = randomPlace()
    const destName = randomPlace(originName)
    trips.push({
      id: `trip-pending-${i + 1}`,
      reference: `TR-${1050 + i}`,
      origin: originName,
      destination: destName,
      originCoord: PLACES[originName],
      destinationCoord: PLACES[destName],
      vehicleId: null,
      driverId: null,
      status: 'pending',
      cargo: ['Furniture', 'Retail stock'][i],
      distanceKm: Math.round(routeLengthKm(buildRoute(PLACES[originName], PLACES[destName])) * 10) / 10,
      createdAt: Date.now() - Math.floor(Math.random() * 1800_000),
      eta: null,
      progress: 0,
    })
  }

  return {
    vehicles,
    drivers,
    trips,
    alerts: [
      {
        id: 'alert-seed-1',
        level: 'warning',
        title: 'Low fuel',
        detail: 'Van 02 fuel level below 30%.',
        vehicleId: 'veh-4',
        createdAt: Date.now() - 600_000,
        read: false,
      },
      {
        id: 'alert-seed-2',
        level: 'info',
        title: 'Trip started',
        detail: 'Truck 01 departed for its destination.',
        vehicleId: 'veh-1',
        createdAt: Date.now() - 1_200_000,
        read: false,
      },
    ],
    messages: [
      {
        id: 'msg-seed-1',
        driverId: 'drv-1',
        direction: 'inbound',
        body: 'Heavy traffic on Mombasa Road, running about 10 min late.',
        createdAt: Date.now() - 900_000,
        status: 'read',
      },
      {
        id: 'msg-seed-2',
        driverId: 'drv-1',
        direction: 'outbound',
        body: 'Noted, thanks for the update. Drive safe.',
        createdAt: Date.now() - 850_000,
        status: 'read',
      },
    ],
    settings: {
      mapboxToken: '',
      simulationRunning: true,
      autoReply: true,
    },
  }
}

export { PLACES }
