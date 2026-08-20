import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { useAuth } from '@/lib/auth'
import { FleetMap } from '@/components/FleetMap'
import { Icon } from '@/components/Icon'
import { Sparkline } from '@/components/charts/Sparkline'
import { BarChart } from '@/components/charts/BarChart'
import { Donut, type Segment } from '@/components/charts/Donut'
import { StatSkeleton, CardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { computeAnalytics, type Kpi } from '@/lib/analytics'
import { timeAgo, etaText } from '@/lib/format'
import { markAlertsRead } from '@/lib/actions'
import { ENV_MAPBOX_TOKEN } from '@/lib/env'
import type { View } from '@/components/Sidebar'
import type { VehicleStatus } from '@/lib/types'

const STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  moving: { label: 'Moving', color: '#0f9d63' },
  idle: { label: 'Idle', color: '#c77700' },
  maintenance: { label: 'Maintenance', color: '#7c5cf0' },
  offline: { label: 'Offline', color: '#64748b' },
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const state = useStore()
  const user = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const [range, setRange] = useState<7 | 14>(14)
  const [loading, setLoading] = useState(true)

  // Brief initial load so the skeleton states are real, not decorative.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650)
    return () => clearTimeout(t)
  }, [])

  const analytics = useMemo(() => computeAnalytics(state), [state])
  const inProgress = state.trips.filter((t) => t.status === 'in_progress')
  const unreadAlerts = state.alerts.filter((a) => !a.read).length

  const statusSegments: Segment[] = (Object.keys(STATUS_META) as VehicleStatus[]).map((k) => ({
    key: k,
    label: STATUS_META[k].label,
    color: STATUS_META[k].color,
    value: state.vehicles.filter((v) => v.status === k).length,
  }))
  const deliveries = range === 7 ? analytics.deliveries14.slice(-7) : analytics.deliveries14

  return (
    <>
      <div className="topbar">
        <div>
          <h2>{greeting()}, {user?.name.split(' ')[0] ?? 'there'}</h2>
          <div className="sub">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · here's how the fleet is running
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`live-badge ${state.settings.simulationRunning ? '' : 'paused'}`}>
            <i />{state.settings.simulationRunning ? 'Live' : 'Paused'}
          </span>
          <button className="btn primary" onClick={() => onNavigate('trips')}><Icon name="plus" size={15} /> New Trip</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid kpis" data-tour="kpis">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : analytics.kpis.map((k) => <KpiTile key={k.key} kpi={k} />)}
      </div>

      {/* Charts row */}
      <div className="grid analytics-grid">
        {loading ? (
          <>
            <CardSkeleton rows={3} height={300} />
            <CardSkeleton rows={4} height={300} />
          </>
        ) : (
          <>
            <div className="card">
              <div className="card-head">
                <div>
                  <h3>Delivery volume</h3>
                  <div className="card-sub">{analytics.deliveriesTotal.toLocaleString()} deliveries · last {range} days</div>
                </div>
                <Segmented value={range} onChange={setRange} options={[{ v: 7, l: '7D' }, { v: 14, l: '14D' }]} />
              </div>
              <BarChart data={deliveries} height={222} />
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h3>Fleet status</h3>
                  <div className="card-sub">{state.vehicles.length} vehicles</div>
                </div>
              </div>
              <div className="status-block">
                <Donut segments={statusSegments} centerLabel="vehicles" />
                <div className="donut-legend">
                  {statusSegments.map((s) => (
                    <div className="legend-row" key={s.key}>
                      <span className="legend-swatch" style={{ background: s.color }} />
                      <span className="legend-name">{s.label}</span>
                      <span className="legend-count">{s.value}</span>
                      <span className="legend-pct">{state.vehicles.length ? Math.round((s.value / state.vehicles.length) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Map + rail */}
      <div className="grid dashboard-grid" style={{ marginTop: 18 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }} data-tour="map">
          <div className="card-head" style={{ padding: '16px 18px 0' }}>
            <div>
              <h3>Live fleet map</h3>
              <div className="card-sub">{state.vehicles.filter((v) => v.status === 'moving').length} vehicles moving now</div>
            </div>
            <button className="link" onClick={() => onNavigate('map')}>Open full map →</button>
          </div>
          <div style={{ padding: '14px 16px 16px' }}>
            {loading
              ? <div className="skeleton" style={{ height: 360, borderRadius: 12, display: 'block' }} />
              : <FleetMap vehicles={state.vehicles} token={state.settings.mapboxToken || ENV_MAPBOX_TOKEN} height={360} selectedId={selected} onSelect={setSelected} />}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <div className="card-head">
              <h3>Active trips</h3>
              <button className="link" onClick={() => onNavigate('trips')}>View all →</button>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gap: 14 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, display: 'block' }} />)}</div>
            ) : inProgress.length === 0 ? (
              <EmptyState variant="trips" title="No active trips" hint="Dispatch a pending trip to see it tracked here." action={<button className="btn sm" onClick={() => onNavigate('trips')}>Go to trips</button>} />
            ) : (
              <div className="trip-list">
                {inProgress.slice(0, 4).map((t) => {
                  const v = state.vehicles.find((veh) => veh.id === t.vehicleId)
                  return (
                    <div className="trip-row" key={t.id}>
                      <div className="trip-ref">{t.reference}</div>
                      <div className="trip-main">
                        <div className="trip-route" title={`${t.origin} → ${t.destination}`}>{t.origin} → {t.destination}</div>
                        <div className="trip-meta">{v?.name ?? 'Unassigned'} · {t.cargo}</div>
                        <div className="bar" style={{ marginTop: 8 }}><span style={{ width: `${Math.round(t.progress * 100)}%` }} /></div>
                      </div>
                      <div className="trip-eta">
                        <div className="trip-eta-val">{etaText(t.eta)}</div>
                        <div className="trip-eta-lbl">ETA</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Recent alerts</h3>
              {unreadAlerts > 0 && <button className="link" onClick={markAlertsRead}>Mark all read</button>}
            </div>
            {loading ? (
              <div style={{ display: 'grid', gap: 14 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, display: 'block' }} />)}</div>
            ) : state.alerts.length === 0 ? (
              <EmptyState variant="alerts" title="All clear" hint="No alerts in the last 24 hours." />
            ) : (
              <div className="alert-list">
                {state.alerts.slice(0, 6).map((a) => (
                  <div className={`alert-item ${a.read ? '' : 'unread'}`} key={a.id}>
                    <span className={`alert-badge ${a.level}`}><Icon name={a.level === 'info' ? 'bell' : a.level === 'warning' ? 'fuel' : 'bell'} size={14} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="a-title">{a.title}</div>
                      <div className="a-detail">{a.detail}</div>
                    </div>
                    <div className="a-time">{timeAgo(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const up = kpi.deltaPct >= 0
  const good = up === kpi.positiveIsGood
  return (
    <div className="card kpi">
      <div className="kpi-head">
        <span className="kpi-label">{kpi.label}</span>
        <span className="kpi-icon"><Icon name={kpi.icon} size={15} /></span>
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value">{kpi.value}</span>
        <span className={`kpi-delta ${good ? 'good' : 'bad'}`}>
          <Icon name="chevron-down" size={13} style={{ transform: up ? 'rotate(180deg)' : 'none' }} />
          {Math.abs(kpi.deltaPct)}{kpi.key === 'ontime' ? 'pts' : '%'}
        </span>
      </div>
      <div className="kpi-foot">{kpi.footnote}</div>
      <div className="kpi-spark"><Sparkline data={kpi.spark} color={kpi.sparkColor} width={240} height={40} /></div>
    </div>
  )
}

function Segmented<T extends number | string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={String(o.v)} className={value === o.v ? 'active' : ''} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  )
}
