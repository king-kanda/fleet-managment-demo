// Deterministic mock analytics for the dashboard. Real products show history and
// trends, so we synthesise stable, realistic series (seeded PRNG → same shape on
// every render) rather than random noise that flickers. Current-state KPIs are
// derived from the live store; historical series are generated here.

import type { AppState } from './types'

// mulberry32 — tiny deterministic PRNG so charts are stable across renders.
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface DayPoint {
  label: string // e.g. "Mon 12"
  value: number
  weekend: boolean
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Build an `n`-day series ending today. `base`/`amp` set the level and swing;
 * weekends dip. Deterministic per `seed`.
 */
export function buildSeries(n: number, base: number, amp: number, seed: number, opts?: { round?: boolean; min?: number }): DayPoint[] {
  const r = rng(seed)
  const out: DayPoint[] = []
  const now = new Date()
  let drift = 0
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6
    drift += (r() - 0.45) * amp * 0.4 // gentle trend
    const seasonal = Math.sin((i / n) * Math.PI * 1.5) * amp * 0.25
    const noise = (r() - 0.5) * amp
    let v = base + drift + seasonal + noise - (weekend ? amp * 0.9 : 0)
    if (opts?.min != null) v = Math.max(opts.min, v)
    out.push({
      label: `${DAY_NAMES[dow]} ${d.getDate()}`,
      value: opts?.round === false ? Math.round(v * 10) / 10 : Math.round(v),
      weekend,
    })
  }
  return out
}

export interface Kpi {
  key: string
  label: string
  icon: string
  value: string
  raw: number
  deltaPct: number // week-over-week %
  positiveIsGood: boolean
  spark: DayPoint[]
  sparkColor: 'brand' | 'green' | 'amber'
  footnote: string
}

function weekOverWeek(series: DayPoint[]): number {
  if (series.length < 8) return 0
  const last = series[series.length - 1].value
  const prev = series[series.length - 8].value
  if (!prev) return 0
  return Math.round(((last - prev) / prev) * 1000) / 10
}

export interface DashboardAnalytics {
  kpis: Kpi[]
  deliveries14: DayPoint[]
  deliveriesTotal: number
  onTimeRate: number
}

export function computeAnalytics(state: AppState): DashboardAnalytics {
  const total = state.vehicles.length
  const active = state.vehicles.filter((v) => v.status === 'moving').length
  const utilization = total ? Math.round((active / total) * 100) : 0

  // Historical series (stable).
  const deliveries14 = buildSeries(14, 22, 10, 101, { min: 3 })
  const utilSpark = buildSeries(14, 64, 14, 202, { min: 20 })
  const onTimeSpark = buildSeries(14, 93, 5, 303, { round: false, min: 80 })
  const distanceSpark = buildSeries(14, 1180, 340, 404, { min: 300 })

  // Anchor the last spark point to the live value so the number and trend agree.
  utilSpark[utilSpark.length - 1].value = utilization
  const deliveriesToday = deliveries14[deliveries14.length - 1].value
  const onTimeRate = onTimeSpark[onTimeSpark.length - 1].value
  const distance7 = distanceSpark.slice(-7).reduce((s, p) => s + p.value, 0)

  const kpis: Kpi[] = [
    {
      key: 'utilization',
      label: 'Fleet utilization',
      icon: 'truck',
      value: `${utilization}%`,
      raw: utilization,
      deltaPct: weekOverWeek(utilSpark),
      positiveIsGood: true,
      spark: utilSpark,
      sparkColor: 'brand',
      footnote: `${active} of ${total} vehicles active`,
    },
    {
      key: 'deliveries',
      label: 'Deliveries today',
      icon: 'check',
      value: `${deliveriesToday}`,
      raw: deliveriesToday,
      deltaPct: weekOverWeek(deliveries14),
      positiveIsGood: true,
      spark: deliveries14,
      sparkColor: 'green',
      footnote: `${deliveries14.slice(-7).reduce((s, p) => s + p.value, 0)} in the last 7 days`,
    },
    {
      key: 'ontime',
      label: 'On-time rate',
      icon: 'clock',
      value: `${onTimeRate.toFixed(1)}%`,
      raw: onTimeRate,
      deltaPct: Math.round((onTimeRate - onTimeSpark[onTimeSpark.length - 8].value) * 10) / 10,
      positiveIsGood: true,
      spark: onTimeSpark,
      sparkColor: 'green',
      footnote: 'vs 90% target',
    },
    {
      key: 'distance',
      label: 'Distance · 7 days',
      icon: 'route',
      value: `${distance7.toLocaleString()} km`,
      raw: distance7,
      deltaPct: weekOverWeek(distanceSpark),
      positiveIsGood: true,
      spark: distanceSpark,
      sparkColor: 'brand',
      footnote: 'across all vehicles',
    },
  ]

  const deliveriesTotal = deliveries14.reduce((s, p) => s + p.value, 0)
  return { kpis, deliveries14, deliveriesTotal, onTimeRate }
}
