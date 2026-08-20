import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
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

      {showNew && <NewTripDialog onClose={() => setShowNew(false)} />}
      {assigningTrip && (
        <DispatchDialog
          tripId={assigningTrip}
          vehicles={availableVehicles.length ? availableVehicles : state.vehicles.filter((v) => v.status !== 'moving')}
          onClose={() => setAssigningTrip(null)}
        />
      )}
    </>
  )
}

function NewTripDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const names = Object.keys(PLACES)
  const placeOptions = names.map((n) => ({ value: n, label: n }))
  const [origin, setOrigin] = useState(names[0])
  const [destination, setDestination] = useState(names[1])
  const [cargo, setCargo] = useState('General freight')

  const valid = origin !== destination
  const submit = () => {
    if (!valid) return
    const trip = createTrip({ origin, destination, originCoord: PLACES[origin], destinationCoord: PLACES[destination], cargo })
    toast({ title: 'Trip created', description: `${trip.reference} · ${origin} → ${destination}`, variant: 'success' })
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Create trip"
      description="Add a delivery job. Dispatch it to a vehicle from the trips list."
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!valid}>Create trip</button>
        </>
      }
    >
      <div className="form-row">
        <div className="field">
          <label>Origin</label>
          <Select value={origin} onValueChange={setOrigin} options={placeOptions} />
        </div>
        <div className="field">
          <label>Destination</label>
          <Select value={destination} onValueChange={setDestination} options={placeOptions} />
        </div>
      </div>
      <div className="field">
        <label>Cargo</label>
        <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="What's being transported?" />
      </div>
      {!valid && <div className="login-error">Origin and destination must differ.</div>}
    </Dialog>
  )
}

function DispatchDialog({ tripId, vehicles, onClose }: { tripId: string; vehicles: ReturnType<typeof useStore>['vehicles']; onClose: () => void }) {
  const state = useStore()
  const { toast } = useToast()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')

  const options = vehicles.map((v) => {
    const d = state.drivers.find((drv) => drv.id === v.driverId)
    return { value: v.id, label: `${v.name} — ${d?.name ?? 'no driver'}` }
  })

  const submit = () => {
    if (!vehicleId) return
    const trip = state.trips.find((t) => t.id === tripId)
    assignTrip(tripId, vehicleId)
    toast({ title: 'Trip dispatched', description: `${trip?.reference ?? ''} · driver notified on WhatsApp`, variant: 'success' })
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Dispatch trip"
      description="Assign a vehicle. The driver is notified automatically over WhatsApp."
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!vehicleId}><Icon name="send" size={14} /> Dispatch &amp; notify</button>
        </>
      }
    >
      <div className="field">
        <label>Vehicle</label>
        <Select value={vehicleId} onValueChange={setVehicleId} options={options} placeholder="Select a vehicle" />
      </div>
    </Dialog>
  )
}
