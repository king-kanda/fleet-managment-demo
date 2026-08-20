import { useState } from 'react'

export interface Segment {
  key: string
  label: string
  value: number
  color: string
}

/**
 * Status donut. Segments carry a 2px surface gap (secondary encoding for the
 * status palette), a hover lift, and a center total. Identity is never colour
 * alone — the legend direct-labels every segment with its count.
 */
export function Donut({ segments, size = 168, thickness = 22, centerLabel }: {
  segments: Segment[]
  size?: number
  thickness?: number
  centerLabel?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const gap = total > 1 ? 3 : 0 // px gap between segments

  let offset = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total
      const len = frac * circ
      const dash = Math.max(0, len - gap)
      const arc = { ...s, dash, offset }
      offset += len
      return arc
    })

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {arcs.map((a) => {
          const active = hover === a.key
          return (
            <circle
              key={a.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={active ? thickness + 4 : thickness}
              strokeDasharray={`${a.dash} ${circ - a.dash}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-width .14s', cursor: 'pointer' }}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-total">{total}</div>
        <div className="donut-sub">{centerLabel ?? 'total'}</div>
      </div>
    </div>
  )
}
