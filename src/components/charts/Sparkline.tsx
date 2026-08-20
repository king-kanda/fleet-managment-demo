import { useId } from 'react'
import type { DayPoint } from '@/lib/analytics'

const COLORS = {
  brand: '#4f46e5',
  green: '#0f9d63',
  amber: '#c77700',
}

/**
 * Compact trend line for stat tiles. Area fill + 2px line, last point marked.
 * No axes or grid — it reads as texture beneath the headline number.
 */
export function Sparkline({ data, color = 'brand', width = 120, height = 40 }: {
  data: DayPoint[]
  color?: keyof typeof COLORS
  width?: number
  height?: number
}) {
  const id = useId()
  const stroke = COLORS[color]
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 3

  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`
  const last = pts[pts.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}
