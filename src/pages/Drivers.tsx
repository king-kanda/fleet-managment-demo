import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RowMenu } from '@/components/ui/RowMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/Toast'
import { addDriver, deleteDriver, sendMessage, updateDriver, type DriverInput } from '@/lib/actions'
import { initials } from '@/lib/format'
import type { Driver } from '@/lib/types'

export function Drivers() {
  const state = useStore()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Driver | 'new' | null>(null)

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Drivers</h2>
          <div className="sub">{state.drivers.filter((d) => d.status === 'on_trip').length} on trip · {state.drivers.filter((d) => d.status === 'available').length} available</div>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" size={15} /> Add Driver</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Rating</th>
              <th>Status</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.drivers.map((d) => {
              const v = state.vehicles.find((veh) => veh.id === d.vehicleId)
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div className="avatar" style={{ background: d.avatarColor }}>{initials(d.name)}</div>
                      <span style={{ fontWeight: 560 }}>{d.name}</span>
                    </div>
                  </td>
                  <td><span className="mono">{d.phone}</span></td>
                  <td>{v?.name ?? <span className="tag">none</span>}</td>
                  <td><span className="rating"><Icon name="star" size={13} style={{ color: '#eab308' }} /> {d.rating.toFixed(1)}</span></td>
                  <td><span className={`pill ${d.status}`}>{d.status.replace('_', ' ')}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Tooltip content="Message on WhatsApp">
                        <button
                          className="icon-btn"
                          aria-label="Message driver"
                          onClick={() => { sendMessage(d.id, `Hi ${d.name.split(' ')[0]}, this is dispatch. Please confirm your availability.`); toast({ title: 'Message sent', description: `To ${d.name} on WhatsApp`, variant: 'success' }) }}
                        >
                          <Icon name="chat" size={16} />
                        </button>
                      </Tooltip>
                      <RowMenu
                        actions={[
                          { label: 'Edit driver', icon: 'edit', onSelect: () => setEditing(d) },
                          {
                            label: 'Remove',
                            icon: 'trash',
                            destructive: true,
                            render: (child) => (
                              <ConfirmDialog
                                trigger={child}
                                title={`Remove ${d.name}?`}
                                description="This removes the driver and unassigns them from any vehicle."
                                confirmLabel="Remove driver"
                                destructive
                                onConfirm={() => { deleteDriver(d.id); toast({ title: 'Driver removed', description: d.name, variant: 'success' }) }}
                              />
                            ),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <DriverDialog
          driver={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name, isNew) => toast({ title: isNew ? 'Driver added' : 'Driver updated', description: name, variant: 'success' })}
        />
      )}
    </>
  )
}

function DriverDialog({ driver, onClose, onSaved }: { driver: Driver | null; onClose: () => void; onSaved: (name: string, isNew: boolean) => void }) {
  const [name, setName] = useState(driver?.name ?? '')
  const [phone, setPhone] = useState(driver?.phone ?? '+254')
  const [rating, setRating] = useState(driver?.rating ?? 5)

  const valid = name.trim() && /^\+?\d{7,15}$/.test(phone.replace(/\s/g, ''))

  const save = () => {
    if (!valid) return
    const input: DriverInput = { name: name.trim(), phone: phone.trim(), rating: Number(rating) }
    if (driver) updateDriver(driver.id, input)
    else addDriver(input)
    onSaved(input.name, !driver)
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={driver ? 'Edit driver' : 'Add driver'}
      description={driver ? 'Update this driver’s profile.' : 'Add a new driver to your roster.'}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!valid}>{driver ? 'Save changes' : 'Add driver'}</button>
        </>
      }
    >
      <div className="field">
        <label>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Otieno" />
      </div>
      <div className="field">
        <label>WhatsApp number</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" />
        <div className="field-hint">Used as the driver’s WhatsApp identity for dispatch.</div>
      </div>
      <div className="field">
        <label>Rating ({Number(rating).toFixed(1)} ★)</label>
        <input type="range" min={1} max={5} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
      </div>
    </Dialog>
  )
}
