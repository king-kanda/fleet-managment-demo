// Core domain types for the FleetPulse demo.
// Everything is persisted client-side (localStorage) — no backend.

export type LngLat = [number, number] // [longitude, latitude]

export type VehicleStatus = 'moving' | 'idle' | 'offline' | 'maintenance'

export interface Vehicle {
  id: string
  name: string // e.g. "Truck 01"
  plate: string
  type: 'truck' | 'van' | 'car' | 'bike'
  driverId: string | null
  status: VehicleStatus
  position: LngLat
  heading: number // degrees, 0 = north
  speedKph: number
  fuelPct: number
  odometerKm: number
  // Route the vehicle is currently following (list of waypoints in lng/lat).
  route: LngLat[]
  routeProgress: number // 0..1 across the whole route
  activeTripId: string | null
}

export type DriverStatus = 'on_trip' | 'available' | 'off_duty'

export interface Driver {
  id: string
  name: string
  phone: string // E.164, used as the WhatsApp identity
  avatarColor: string
  status: DriverStatus
  vehicleId: string | null
  rating: number // 1..5
}

export type TripStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export interface Trip {
  id: string
  reference: string // e.g. "TR-1042"
  origin: string
  destination: string
  originCoord: LngLat
  destinationCoord: LngLat
  vehicleId: string | null
  driverId: string | null
  status: TripStatus
  cargo: string
  distanceKm: number
  createdAt: number
  eta: number | null // epoch ms
  progress: number // 0..1
}

export type AlertLevel = 'info' | 'warning' | 'critical'

export interface Alert {
  id: string
  level: AlertLevel
  title: string
  detail: string
  vehicleId: string | null
  createdAt: number
  read: boolean
}

export type MessageDirection = 'inbound' | 'outbound'

export interface WhatsAppMessage {
  id: string
  driverId: string
  direction: MessageDirection
  body: string
  createdAt: number
  status: 'sent' | 'delivered' | 'read'
  // Marks messages produced by the automated dispatch bot vs a human dispatcher.
  automated?: boolean
}

export interface AppState {
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
  alerts: Alert[]
  messages: WhatsAppMessage[]
  settings: {
    mapboxToken: string
    simulationRunning: boolean
    autoReply: boolean
  }
}
