import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Icon } from './Icon'
import { useStore } from '@/hooks/useStore'
import { signOut, useAuth } from '@/lib/auth'
import { initials } from '@/lib/format'

export type View = 'dashboard' | 'map' | 'fleet' | 'trips' | 'drivers' | 'whatsapp' | 'settings'

const NAV: Array<{ section: string; items: Array<{ id: View; label: string; icon: string }> }> = [
  {
    section: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'map', label: 'Live Map', icon: 'map' },
      { id: 'trips', label: 'Trips', icon: 'route' },
    ],
  },
  {
    section: 'Management',
    items: [
      { id: 'fleet', label: 'Fleet', icon: 'truck' },
      { id: 'drivers', label: 'Drivers', icon: 'users' },
    ],
  },
  {
    section: 'Communication',
    items: [{ id: 'whatsapp', label: 'WhatsApp', icon: 'chat' }],
  },
  {
    section: 'Workspace',
    items: [{ id: 'settings', label: 'Settings', icon: 'settings' }],
  },
]

export function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const state = useStore()
  const unreadMsgs = countUnread(state)

  return (
    <aside className="sidebar" data-tour="nav">
      <div className="brand">
        <div className="logo">
          <Icon name="truck" size={19} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1>FleetPulse</h1>
          <span>Fleet Management</span>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.section}>
          <div className="nav-label">{group.section}</div>
          {group.items.map((item) => (
            <button
              key={item.id}
              data-tour={item.id === 'whatsapp' ? 'whatsapp' : undefined}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.id === 'whatsapp' && unreadMsgs > 0 && <span className="badge">{unreadMsgs}</span>}
            </button>
          ))}
        </div>
      ))}

      <div className="nav-spacer" />
      <UserMenu />
    </aside>
  )
}

function UserMenu() {
  const user = useAuth()
  if (!user) return null
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="user-chip" data-tour="account">
          <div className="avatar" style={{ background: 'linear-gradient(140deg,#6366f1,#4f46e5)' }}>{initials(user.name)}</div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <Icon name="chevron-down" size={15} style={{ color: 'var(--text-faint)', marginLeft: 'auto' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align="start" side="top" sideOffset={6} style={{ width: 208 }}>
          <div className="menu-user">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.email}</div>
          </div>
          <DropdownMenu.Separator className="menu-separator" />
          <DropdownMenu.Item className="menu-item" onSelect={() => (window as unknown as { __startTour?: () => void }).__startTour?.()}>
            <Icon name="sparkles" size={15} /> Product tour
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item destructive" onSelect={() => signOut()}>
            <Icon name="logout" size={15} /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
