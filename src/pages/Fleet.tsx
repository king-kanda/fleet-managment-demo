import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RowMenu } from '@/components/ui/RowMenu'
import { useToast } from '@/components/ui/Toast'
import { addVehicle, deleteVehicle, updateVehicle, type VehicleInput } from '@/lib/actions'
import type { Vehicle } from '@/lib/types'

const TYPE_OPTIONS = [
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Motorbike' },
]

export function Fleet() {
  const state = useStore()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Fleet</h2>
          <div className="sub">{state.vehicles.length} vehicles · {state.vehicles.filter((v) => v.status === 'moving').length} active now</div>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={15} /> Add Vehicle</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate</th>
              <th>Type</th>
              <th>Driver</th>
              <th>Fuel</th>
              <th>Odometer</th>
              <th>Status</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.vehicles.map((v) => {
              const driver = state.drivers.find((d) => d.id === v.driverId)
              const low = v.fuelPct < 25
              return (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div className="veh-icon"><Icon name={v.type === 'bike' ? 'route' : v.type === 'truck' ? 'truck' : 'car'} size={16} /></div>
                      <span style={{ fontWeight: 560 }}>{v.name}</span>
                    </div>
                  </td>
                  <td><span className="mono">{v.plate}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.type}</td>
                  <td>{driver?.name ?? <span className="tag">unassigned</span>}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="bar fuel-bar" style={{ width: 60 }}><span className={low ? 'low' : ''} style={{ width: `${v.fuelPct}%` }} /></div>
                      <span className="meta" style={{ minWidth: 30 }}>{Math.round(v.fuelPct)}%</span>
                    </div>
                  </td>
                  <td>{v.odometerKm.toLocaleString()} km</td>
                  <td><span className={`pill ${v.status}`}>{v.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <RowMenu
                      actions={[
                        { label: 'Edit vehicle', icon: 'edit', onSelect: () => setEditing(v) },
                        {
                          label: 'Delete',
                          icon: 'trash',
                          destructive: true,
                          render: (child) => (
                            <ConfirmDialog
                              trigger={child}
                              title={`Delete ${v.name}?`}
                              description="This removes the vehicle from your fleet and unassigns its driver. Any active trip is cancelled."
                              confirmLabel="Delete vehicle"
                              destructive
                              onConfirm={() => { deleteVehicle(v.id); toast({ title: 'Vehicle deleted', description: v.name, variant: 'success' }) }}
                            />
                          ),
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <VehicleDialog
          vehicle={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name, isNew) => toast({ title: isNew ? 'Vehicle added' : 'Vehicle updated', description: name, variant: 'success' })}
        />
      )}
    </>
  )
}

function VehicleDialog({ vehicle, onClose, onSaved }: { vehicle: Vehicle | null; onClose: () => void; onSaved: (name: string, isNew: boolean) => void }) {
  const state = useStore()
  const [name, setName] = useState(vehicle?.name ?? '')
  const [plate, setPlate] = useState(vehicle?.plate ?? '')
  const [type, setType] = useState<Vehicle['type']>(vehicle?.type ?? 'truck')
  const [fuelPct, setFuelPct] = useState(vehicle?.fuelPct ?? 100)
  const [driverId, setDriverId] = useState<string>(vehicle?.driverId ?? '')

  // Drivers available to assign: unassigned, or already this vehicle's driver.
  const driverOptions = [
    { value: '', label: 'No driver' },
    ...state.drivers
      .filter((d) => !d.vehicleId || d.id === vehicle?.driverId)
      .map((d) => ({ value: d.id, label: d.name })),
  ]

  const valid = name.trim() && plate.trim()

  const save = () => {
    if (!valid) return
    const input: VehicleInput = { name: name.trim(), plate: plate.trim().toUpperCase(), type, fuelPct: Number(fuelPct), driverId: driverId || null }
    if (vehicle) updateVehicle(vehicle.id, input)
    else addVehicle(input)
    onSaved(input.name, !vehicle)
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={vehicle ? 'Edit vehicle' : 'Add vehicle'}
      description={vehicle ? 'Update this vehicle’s details.' : 'Register a new vehicle in your fleet.'}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!valid}>{vehicle ? 'Save changes' : 'Add vehicle'}</button>
        </>
      }
    >
      <div className="field">
        <label>Vehicle name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Truck 09" />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Number plate</label>
          <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="KDA 000X" />
        </div>
        <div className="field">
          <label>Type</label>
          <Select value={type} onValueChange={(v) => setType(v as Vehicle['type'])} options={TYPE_OPTIONS} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Fuel level ({Math.round(Number(fuelPct))}%)</label>
          <input type="range" min={0} max={100} value={fuelPct} onChange={(e) => setFuelPct(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Assigned driver</label>
          <Select value={driverId} onValueChange={setDriverId} options={driverOptions} placeholder="No driver" />
        </div>
      </div>
    </Dialog>
  )
}
