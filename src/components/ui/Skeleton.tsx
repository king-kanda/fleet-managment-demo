import type { CSSProperties } from 'react'

export function Skeleton({ w, h = 14, r = 6, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width: w ?? '100%', height: h, borderRadius: r, ...style }} />
}

/** Full stat-tile skeleton, matching the real tile's geometry so the swap is seamless. */
export function StatSkeleton() {
  return (
    <div className="card kpi">
      <div className="kpi-head">
        <Skeleton w={96} h={12} />
        <Skeleton w={26} h={26} r={8} />
      </div>
      <Skeleton w={80} h={30} style={{ marginTop: 14 }} />
      <Skeleton w={120} h={11} style={{ marginTop: 12 }} />
      <Skeleton w="100%" h={40} style={{ marginTop: 14 }} />
    </div>
  )
}

export function CardSkeleton({ rows = 4, height }: { rows?: number; height?: number }) {
  return (
    <div className="card" style={height ? { height } : undefined}>
      <Skeleton w={140} h={15} />
      <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton w={34} h={34} r={9} />
            <div style={{ flex: 1, display: 'grid', gap: 7 }}>
              <Skeleton w={`${55 + ((i * 13) % 30)}%`} h={12} />
              <Skeleton w={`${30 + ((i * 17) % 25)}%`} h={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
