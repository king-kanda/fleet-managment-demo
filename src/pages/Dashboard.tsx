import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { FleetMap } from '@/components/FleetMap'
import { Icon } from '@/components/Icon'
import { timeAgo, etaText } from '@/lib/format'
import { markAlertsRead } from '@/lib/actions'
import { ENV_MAPBOX_TOKEN } from '@/lib/env'
import type { View } from '@/components/Sidebar'

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const state = useStore()
  const [selected, setSelected] = useState<string | null>(null)

  const active = state.vehicles.filter((v) => v.status === 'moving').length
  const inProgress = state.trips.filter((t) => t.status === 'in_progress')
  const pending = state.trips.filter((t) => t.status === 'pending').length
  const avgFuel = Math.round(
    state.vehicles.reduce((s, v) => s + v.fuelPct, 0) / Math.max(1, state.vehicles.length),
  )
  const unreadAlerts = state.alerts.filter((a) => !a.read).length

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Fleet Overview</h2>
          <div className="sub">Real-time status across your entire fleet</div>
        </div>
        <div className="topbar-actions">
          <span className={`live-badge ${state.settings.simulationRunning ? '' : 'paused'}`}>
            <i />
            {state.settings.simulationRunning ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>

      <div className="grid stats">
        <StatCard label="Active Vehicles" value={`${active}/${state.vehicles.length}`} icon="truck" trend={`${active} on the road now`} />
        <StatCard label="Trips In Progress" value={inProgress.length} icon="route" trend={`${pending} awaiting dispatch`} />
        <StatCard label="Avg Fuel Level" value={`${avgFuel}%`} icon="fuel" trend={avgFuel < 40 ? 'Some vehicles low' : 'Healthy'} />
        <StatCard label="Open Alerts" value={unreadAlerts} icon="bell" trend={unreadAlerts ? 'Needs attention' : 'All clear'} />
      </div>

      <div className="grid dashboard-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '14px 18px 0' }}>
              <h3>Live Fleet Map</h3>
              <button className="link" onClick={() => onNavigate('map')}>Open full map →</button>
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <FleetMap vehicles={state.vehicles} token={state.settings.mapboxToken || ENV_MAPBOX_TOKEN} height={380} selectedId={selected} onSelect={setSelected} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Active Trips</h3>
              <button className="link" onClick={() => onNavigate('trips')}>View all →</button>
            </div>
            {inProgress.length === 0 && <div className="empty-state">No trips in progress.</div>}
            <div className="list">
              {inProgress.slice(0, 5).map((t) => {
                const v = state.vehicles.find((veh) => veh.id === t.vehicleId)
                return (
                  <div className="row" key={t.id}>
                    <div>
                      <div className="title">{t.reference} · {t.origin} → {t.destination}</div>
                      <div className="meta">{v?.name} · {t.cargo}</div>
                    </div>
                    <div className="spacer" />
                    <div style={{ minWidth: 120 }}>
                      <div className="bar"><span style={{ width: `${Math.round(t.progress * 100)}%` }} /></div>
                      <div className="meta" style={{ marginTop: 4, textAlign: 'right' }}>ETA {etaText(t.eta)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Recent Alerts</h3>
            {unreadAlerts > 0 && <button className="link" onClick={markAlertsRead}>Mark all read</button>}
          </div>
          {state.alerts.length === 0 && <div className="empty-state">No alerts.</div>}
          {state.alerts.slice(0, 10).map((a) => (
            <div className="alert-item" key={a.id}>
              <span className={`alert-dot ${a.level}`} />
              <div>
                <div className="a-title">{a.title}</div>
                <div className="a-detail">{a.detail}</div>
                <div className="a-time">{timeAgo(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend: string }) {
  return (
    <div className="card stat">
      <div className="icon"><Icon name={icon} size={19} style={{ color: 'var(--brand-2)' }} /></div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="trend">{trend}</div>
    </div>
  )
}
