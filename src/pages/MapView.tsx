import { useMemo, useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { FleetMap } from '@/components/FleetMap'
import { Icon } from '@/components/Icon'
import { sendMessage } from '@/lib/actions'
import { ENV_MAPBOX_TOKEN } from '@/lib/env'
import { initials } from '@/lib/format'
import type { Vehicle } from '@/lib/types'

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  moving: '#0f9d63',
  idle: '#c77700',
  offline: '#64748b',
  maintenance: '#7c5cf0',
}

export function MapView() {
  const state = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(true)

  const vehicle = state.vehicles.find((v) => v.id === selected) ?? null
  const driver = state.drivers.find((d) => d.id === vehicle?.driverId)
  const trip = state.trips.find((t) => t.id === vehicle?.activeTripId)
  const movingCount = state.vehicles.filter((v) => v.status === 'moving').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? state.vehicles.filter((v) => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q))
      : state.vehicles
    // Moving first, then by name.
    return [...list].sort((a, b) => (a.status === 'moving' ? -1 : 1) - (b.status === 'moving' ? -1 : 1))
  }, [state.vehicles, query])

  return (
    <div className="mapview">
      <FleetMap
        vehicles={state.vehicles}
        token={state.settings.mapboxToken || ENV_MAPBOX_TOKEN}
        fill
        selectedId={selected}
        onSelect={setSelected}
      />

      {/* Floating header */}
      <div className="map-float map-header">
        <div>
          <div className="map-header-title">Live Map</div>
          <div className="map-header-sub"><span className="live-badge"><i />{movingCount} moving</span> · {state.vehicles.length} vehicles</div>
        </div>
        <button className="icon-btn" onClick={() => setListOpen((o) => !o)} aria-label="Toggle vehicle list">
          <Icon name={listOpen ? 'close' : 'search'} size={18} />
        </button>
      </div>

      {/* Floating vehicle list */}
      {listOpen && (
        <div className="map-float map-list">
          <div className="map-search">
            <Icon name="search" size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vehicle or plate…" />
          </div>
          <div className="map-list-scroll">
            {filtered.slice(0, 60).map((v) => {
              const d = state.drivers.find((drv) => drv.id === v.driverId)
              return (
                <button key={v.id} className={`map-list-row ${selected === v.id ? 'active' : ''}`} onClick={() => setSelected(v.id)}>
                  <span className="map-dot" style={{ background: STATUS_COLOR[v.status] }} />
                  <span className="map-list-name">{v.name}</span>
                  <span className="map-list-meta">{d?.name.split(' ')[0] ?? '—'}</span>
                  {v.status === 'moving' && <span className="map-list-speed">{Math.round(v.speedKph)}<i>km/h</i></span>}
                </button>
              )
            })}
            {filtered.length === 0 && <div className="empty-hint" style={{ padding: 20 }}>No vehicles match “{query}”.</div>}
          </div>
        </div>
      )}

      {/* Floating detail card */}
      {vehicle && (
        <div className="map-float map-detail">
          <button className="map-detail-close icon-btn" onClick={() => setSelected(null)} aria-label="Close"><Icon name="close" size={16} /></button>
          <div className="map-detail-head">
            <span className="veh-icon"><Icon name={vehicle.type === 'bike' ? 'route' : vehicle.type === 'truck' ? 'truck' : 'car'} size={18} /></span>
            <div>
              <div className="map-detail-name">{vehicle.name}</div>
              <div className="meta"><span className="mono">{vehicle.plate}</span> · <span className={`pill ${vehicle.status}`}>{vehicle.status}</span></div>
            </div>
          </div>

          <div className="map-detail-stats">
            <Stat label="Speed" value={`${Math.round(vehicle.speedKph)}`} unit="km/h" />
            <Stat label="Fuel" value={vehicle.hasFuelSensor ? `${Math.round(vehicle.fuelPct)}` : '—'} unit={vehicle.hasFuelSensor ? '%' : 'n/a'} />
            <Stat label="Odometer" value={vehicle.odometerKm.toLocaleString()} unit="km" />
          </div>

          {trip && (
            <div className="map-detail-trip">
              <div className="meta" style={{ marginBottom: 5 }}>Current trip · {trip.reference}</div>
              <div style={{ fontWeight: 550, fontSize: 13.5 }}>{trip.origin} → {trip.destination}</div>
              <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${Math.round(trip.progress * 100)}%` }} /></div>
            </div>
          )}

          {driver && (
            <div className="map-detail-driver">
              <div className="avatar" style={{ background: driver.avatarColor }}>{initials(driver.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 13.5 }}>{driver.name}</div>
                <div className="meta">{driver.phone}</div>
              </div>
              <button className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={() => sendMessage(driver.id, `Hi ${driver.name.split(' ')[0]}, checking in on your location. All good?`)}>
                <Icon name="chat" size={14} /> Message
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="map-stat">
      <div className="map-stat-label">{label}</div>
      <div className="map-stat-value">{value}<span>{unit}</span></div>
    </div>
  )
}
