import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { FleetMap } from '@/components/FleetMap'
import { Icon } from '@/components/Icon'
import { sendMessage } from '@/lib/actions'
import { ENV_MAPBOX_TOKEN } from '@/lib/env'
import { initials } from '@/lib/format'

export function MapView() {
  const state = useStore()
  const [selected, setSelected] = useState<string | null>(state.vehicles[0]?.id ?? null)
  const vehicle = state.vehicles.find((v) => v.id === selected) ?? null
  const driver = state.drivers.find((d) => d.id === vehicle?.driverId)
  const trip = state.trips.find((t) => t.id === vehicle?.activeTripId)

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Live Map</h2>
          <div className="sub">{state.vehicles.filter((v) => v.status === 'moving').length} vehicles moving · updated in real time</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start' }}>
        <FleetMap vehicles={state.vehicles} token={state.settings.mapboxToken || ENV_MAPBOX_TOKEN} height={560} selectedId={selected} onSelect={setSelected} />

        <div className="card" style={{ maxHeight: 560, overflowY: 'auto' }}>
          {vehicle ? (
            <>
              <div className="card-head">
                <h3>{vehicle.name}</h3>
                <span className={`pill ${vehicle.status}`}>{vehicle.status}</span>
              </div>
              <div className="meta" style={{ marginBottom: 14 }}>{vehicle.plate} · {vehicle.type}</div>

              <DetailRow icon="gauge" label="Speed" value={`${Math.round(vehicle.speedKph)} km/h`} />
              <DetailRow icon="fuel" label="Fuel" value={vehicle.hasFuelSensor ? `${Math.round(vehicle.fuelPct)}%` : 'Not configured'} />
              <DetailRow icon="route" label="Odometer" value={`${vehicle.odometerKm.toLocaleString()} km`} />
              <DetailRow icon="map" label="Position" value={`${vehicle.position[1].toFixed(4)}, ${vehicle.position[0].toFixed(4)}`} />

              {trip && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div className="meta" style={{ marginBottom: 6 }}>Current trip</div>
                  <div className="title">{trip.reference}</div>
                  <div className="meta">{trip.origin} → {trip.destination}</div>
                  <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${Math.round(trip.progress * 100)}%` }} /></div>
                </div>
              )}

              {driver && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div className="row" style={{ padding: 0, borderBottom: 0 }}>
                    <div className="avatar" style={{ background: driver.avatarColor }}>{initials(driver.name)}</div>
                    <div>
                      <div className="title">{driver.name}</div>
                      <div className="meta">{driver.phone}</div>
                    </div>
                  </div>
                  <button
                    className="btn sm"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                    onClick={() => sendMessage(driver.id, `Hi ${driver.name.split(' ')[0]}, checking in on your current location. All good?`)}
                  >
                    <Icon name="chat" size={14} /> Message driver on WhatsApp
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">Select a vehicle on the map.</div>
          )}
        </div>
      </div>
    </>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="row" style={{ padding: '9px 0' }}>
      <Icon name={icon} size={16} style={{ color: 'var(--text-faint)' }} />
      <span className="meta">{label}</span>
      <div className="spacer" />
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</span>
    </div>
  )
}
