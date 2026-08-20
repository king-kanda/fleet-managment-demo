import { useState } from 'react'
import type { DayPoint } from '@/lib/analytics'

/**
 * Single-series daily bar chart. Rounded top data-ends anchored to the baseline,
 * recessive gridlines, selective x labels, and a per-bar hover tooltip. Weekend
 * bars are lightened (a second encoding, not a new colour).
 */
export function BarChart({ data, height = 220 }: { data: DayPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const padL = 34
  const padR = 8
  const padT = 12
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(...data.map((d) => d.value))
  const niceMax = Math.ceil(max / 5) * 5
  const bandW = plotW / data.length
  const barW = Math.min(30, bandW - 8)

  const yFor = (v: number) => padT + (1 - v / niceMax) * plotH
  const ticks = [0, niceMax / 2, niceMax]

  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Daily delivery volume, last 14 days">
        {/* gridlines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 8} y={yFor(t) + 3.5} textAnchor="end" fontSize={11} fill="var(--text-faint)">{t}</text>
          </g>
        ))}
        {/* bars */}
        {data.map((d, i) => {
          const x = padL + i * bandW + (bandW - barW) / 2
          const y = yFor(d.value)
          const h = padT + plotH - y
          const active = hover === i
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx={4}
                fill={active ? 'var(--brand-hover)' : 'var(--brand)'}
                opacity={d.weekend && !active ? 0.5 : 1}
                style={{ transition: 'opacity .12s, fill .12s' }}
              />
              {/* wide invisible hit target */}
              <rect x={padL + i * bandW} y={padT} width={bandW} height={plotH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10.5} fill="var(--text-faint)">
                  {d.label.split(' ')[1]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${((padL + hover * bandW + bandW / 2) / W) * 100}%`, top: yFor(data[hover].value) - 6 }}>
          <div className="chart-tip-day">{data[hover].label}{data[hover].weekend ? ' · weekend' : ''}</div>
          <div className="chart-tip-val"><b>{data[hover].value}</b> deliveries</div>
        </div>
      )}
    </div>
  )
}
