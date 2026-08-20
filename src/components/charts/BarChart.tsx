import { useState } from 'react'
import type { DayPoint } from '@/lib/analytics'
import { useElementWidth } from '@/hooks/useElementWidth'

/**
 * Single-series daily bar chart. Renders at the container's measured width so it
 * is fully responsive. Rounded top data-ends anchored to the baseline, recessive
 * gridlines, adaptive x labels, and a per-bar hover tooltip. Weekend bars are
 * lightened (a second encoding, not a new colour).
 */
export function BarChart({ data, height = 220 }: { data: DayPoint[]; height?: number }) {
  const [wrapRef, measured] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const W = Math.max(260, measured || 640)
  const H = height
  const padL = 30
  const padR = 6
  const padT = 12
  const padB = 24
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(1, ...data.map((d) => d.value))
  const niceMax = Math.ceil(max / 5) * 5 || 5
  const bandW = plotW / data.length
  const barW = Math.max(6, Math.min(30, bandW - 8))

  const yFor = (v: number) => padT + (1 - v / niceMax) * plotH
  const ticks = [0, niceMax / 2, niceMax]

  // Show fewer x labels as the chart narrows so they never collide.
  const labelEvery = bandW < 26 ? 3 : bandW < 40 ? 2 : 1

  return (
    <div className="chart" ref={wrapRef} style={{ position: 'relative' }}>
      {measured > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily delivery volume">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={padL - 7} y={yFor(t) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--text-faint)">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = padL + i * bandW + (bandW - barW) / 2
            const y = yFor(d.value)
            const h = padT + plotH - y
            const active = hover === i
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={barW} height={Math.max(2, h)} rx={4}
                  fill={active ? 'var(--brand-hover)' : 'var(--brand)'}
                  opacity={d.weekend && !active ? 0.5 : 1}
                  style={{ transition: 'opacity .12s, fill .12s' }}
                />
                <rect x={padL + i * bandW} y={padT} width={bandW} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize={10} fill="var(--text-faint)">
                    {d.label.split(' ')[1]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover != null && measured > 0 && (
        <div className="chart-tip" style={{ left: `${((padL + hover * bandW + bandW / 2) / W) * 100}%`, top: yFor(data[hover].value) - 6 }}>
          <div className="chart-tip-day">{data[hover].label}{data[hover].weekend ? ' · weekend' : ''}</div>
          <div className="chart-tip-val"><b>{data[hover].value}</b> deliveries</div>
        </div>
      )}
    </div>
  )
}
