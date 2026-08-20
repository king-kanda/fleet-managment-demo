import { Icon } from './Icon'
import { useStore } from '@/hooks/useStore'
import { toggleSimulation } from '@/lib/actions'

export type View = 'dashboard' | 'map' | 'trips' | 'drivers' | 'whatsapp' | 'settings'

const NAV: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'map', label: 'Live Map', icon: 'map' },
  { id: 'trips', label: 'Trips', icon: 'route' },
  { id: 'drivers', label: 'Drivers', icon: 'users' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const state = useStore()
  const unreadMsgs = countUnread(state)
  const running = state.settings.simulationRunning

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">
          <Icon name="truck" size={19} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1>FleetPulse</h1>
          <span>Fleet Management</span>
        </div>
      </div>

      {NAV.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${view === item.id ? 'active' : ''}`}
          onClick={() => setView(item.id)}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
          {item.id === 'whatsapp' && unreadMsgs > 0 && <span className="badge">{unreadMsgs}</span>}
        </button>
      ))}

      <div className="sim-toggle">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className={`live-badge ${running ? '' : 'paused'}`}>
            <i />
            {running ? 'Live simulation' : 'Paused'}
          </span>
        </div>
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={toggleSimulation}>
          <Icon name={running ? 'pause' : 'play'} size={14} />
          {running ? 'Pause' : 'Resume'}
        </button>
      </div>
    </aside>
  )
}

function countUnread(state: ReturnType<typeof useStore>): number {
  // Count inbound messages newer than the latest outbound per driver as "unread".
  const byDriver: Record<string, { lastOut: number; inbound: number }> = {}
  for (const m of state.messages) {
    const rec = (byDriver[m.driverId] ??= { lastOut: 0, inbound: 0 })
    if (m.direction === 'outbound') rec.lastOut = Math.max(rec.lastOut, m.createdAt)
  }
  for (const m of state.messages) {
    if (m.direction === 'inbound' && m.createdAt > byDriver[m.driverId].lastOut) byDriver[m.driverId].inbound++
  }
  return Object.values(byDriver).reduce((sum, r) => sum + r.inbound, 0)
}
