import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { sendMessage } from '@/lib/actions'
import { initials } from '@/lib/format'

export function Drivers() {
  const state = useStore()

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Drivers</h2>
          <div className="sub">{state.drivers.filter((d) => d.status === 'on_trip').length} on trip · {state.drivers.filter((d) => d.status === 'available').length} available</div>
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
              <th></th>
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
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                    </div>
                  </td>
                  <td>{d.phone}</td>
                  <td>{v?.name ?? <span className="tag">none</span>}</td>
                  <td>★ {d.rating.toFixed(1)}</td>
                  <td><span className={`pill ${d.status}`}>{d.status.replace('_', ' ')}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn sm"
                      onClick={() => sendMessage(d.id, `Hi ${d.name.split(' ')[0]}, this is dispatch. Please confirm your availability.`)}
                    >
                      <Icon name="chat" size={13} /> Message
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
