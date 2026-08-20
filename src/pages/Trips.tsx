import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { assignTrip, completeTrip, createTrip } from '@/lib/actions'
import { etaText } from '@/lib/format'
import { PLACES } from '@/data/seed'

export function Trips() {
  const state = useStore()
  const [showNew, setShowNew] = useState(false)
  const [assigningTrip, setAssigningTrip] = useState<string | null>(null)

  const availableVehicles = state.vehicles.filter((v) => v.status === 'idle' || v.status === 'offline')

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Trips</h2>
          <div className="sub">{state.trips.filter((t) => t.status === 'in_progress').length} active · {state.trips.filter((t) => t.status === 'pending').length} pending dispatch</div>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setShowNew(true)}><Icon name="plus" size={15} /> New Trip</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Route</th>
              <th>Cargo</th>
              <th>Vehicle</th>
              <th>Distance</th>
              <th>Progress</th>
              <th>ETA</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.trips.map((t) => {
              const v = state.vehicles.find((veh) => veh.id === t.vehicleId)
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.reference}</td>
                  <td>{t.origin} → {t.destination}</td>
                  <td>{t.cargo}</td>
                  <td>{v?.name ?? <span className="tag">unassigned</span>}</td>
                  <td>{t.distanceKm} km</td>
                  <td>
                    {t.status === 'in_progress' ? (
                      <div className="bar" style={{ maxWidth: 90 }}><span style={{ width: `${Math.round(t.progress * 100)}%` }} /></div>
                    ) : t.status === 'completed' ? '100%' : '—'}
                  </td>
                  <td>{t.status === 'in_progress' ? etaText(t.eta) : '—'}</td>
                  <td><span className={`pill ${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {t.status === 'pending' && (
                      <button className="btn sm primary" onClick={() => setAssigningTrip(t.id)}>Dispatch</button>
                    )}
                    {t.status === 'in_progress' && (
                      <button className="btn sm" onClick={() => completeTrip(t.id)}><Icon name="check" size={13} /> Complete</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNew && <NewTripModal onClose={() => setShowNew(false)} />}
      {assigningTrip && (
        <DispatchModal
          tripId={assigningTrip}
          vehicles={availableVehicles.length ? availableVehicles : state.vehicles.filter((v) => v.status !== 'moving')}
          onClose={() => setAssigningTrip(null)}
        />
      )}
    </>
  )
}

function NewTripModal({ onClose }: { onClose: () => void }) {
  const names = Object.keys(PLACES)
  const [origin, setOrigin] = useState(names[0])
  const [destination, setDestination] = useState(names[1])
  const [cargo, setCargo] = useState('General freight')

  const submit = () => {
    if (origin === destination) return
    createTrip({
      origin,
      destination,
      originCoord: PLACES[origin],
      destinationCoord: PLACES[destination],
      cargo,
    })
    onClose()
  }

  return (
    <Modal title="Create Trip" onClose={onClose}>
      <div className="field">
        <label>Origin</label>
        <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
          {names.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Destination</label>
        <select value={destination} onChange={(e) => setDestination(e.target.value)}>
          {names.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Cargo</label>
        <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="What's being transported?" />
      </div>
      {origin === destination && <div className="meta" style={{ color: 'var(--amber)' }}>Origin and destination must differ.</div>}
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={origin === destination}>Create trip</button>
      </div>
    </Modal>
  )
}

function DispatchModal({ tripId, vehicles, onClose }: { tripId: string; vehicles: ReturnType<typeof useStore>['vehicles']; onClose: () => void }) {
  const state = useStore()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')

  const submit = () => {
    if (!vehicleId) return
    assignTrip(tripId, vehicleId)
    onClose()
  }

  return (
    <Modal title="Dispatch Trip" onClose={onClose}>
      <p className="meta" style={{ marginTop: 0 }}>Assign a vehicle. The driver is notified automatically over WhatsApp.</p>
      <div className="field">
        <label>Vehicle</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {vehicles.length === 0 && <option value="">No available vehicles</option>}
          {vehicles.map((v) => {
            const d = state.drivers.find((drv) => drv.id === v.driverId)
            return <option key={v.id} value={v.id}>{v.name} — {d?.name ?? 'no driver'} ({v.status})</option>
          })}
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={!vehicleId}><Icon name="send" size={14} /> Dispatch & notify</button>
      </div>
    </Modal>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
