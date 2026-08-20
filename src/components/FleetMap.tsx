import { useEffect, useMemo, useRef } from 'react'
import type { Vehicle, LngLat } from '@/lib/types'
import { MAP_CENTER } from '@/data/seed'

interface Props {
  vehicles: Vehicle[]
  token: string
  height?: number
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  moving: '#22c55e',
  idle: '#f59e0b',
  offline: '#64769c',
  maintenance: '#a855f7',
}

export function FleetMap(props: Props) {
  return props.token
    ? <MapboxMap {...props} />
    : <SvgMap {...props} />
}

// ---------------------------------------------------------------------------
// Mapbox GL — used only when the user supplies a token in Settings.
// ---------------------------------------------------------------------------
function MapboxMap({ vehicles, token, height = 460, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      if (cancelled || !containerRef.current) return
      glRef.current = mapboxgl
      mapboxgl.accessToken = token
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: MAP_CENTER,
        zoom: 11,
        attributionControl: false,
      })
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      mapRef.current = map
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, [token])

  // Sync markers with vehicle positions each render.
  useEffect(() => {
    const map = mapRef.current
    const mapboxgl = glRef.current
    if (!map || !mapboxgl) return

    vehicles.forEach((v) => {
      let marker = markersRef.current[v.id]
      if (!marker) {
        const el = document.createElement('div')
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;border:2px solid #fff;cursor:pointer;box-shadow:0 0 0 3px rgba(0,0,0,.35);transition:transform .3s'
        el.title = v.name
        el.addEventListener('click', () => onSelect?.(v.id))
        marker = new mapboxgl.Marker({ element: el }).setLngLat(v.position).addTo(map)
        markersRef.current[v.id] = marker
      }
      marker.setLngLat(v.position)
      const el = marker.getElement() as HTMLDivElement
      el.style.background = STATUS_COLOR[v.status]
      el.style.transform = v.id === selectedId ? 'scale(1.6)' : 'scale(1)'
      el.style.borderColor = v.id === selectedId ? '#38bdf8' : '#fff'
    })
  }, [vehicles, selectedId, onSelect])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" style={{ height }} />
      <Legend />
    </div>
  )
}

// ---------------------------------------------------------------------------
// SVG fallback — always available, no token required.
// ---------------------------------------------------------------------------
function SvgMap({ vehicles, height = 460, selectedId, onSelect }: Props) {
  // Bounding box around Nairobi for the projection.
  const bounds = useMemo(() => ({ minLng: 36.68, maxLng: 36.96, minLat: -1.36, maxLat: -1.2 }), [])
  const W = 1000
  const H = 560

  const project = (c: LngLat): [number, number] => {
    const x = ((c[0] - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * W
    const y = (1 - (c[1] - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * H
    return [x, y]
  }

  // Decorative "road" grid so the fallback still reads as a map.
  const roads = useMemo(() => {
    const lines: string[] = []
    for (let i = 1; i < 8; i++) lines.push(`M0 ${(H / 8) * i} L${W} ${(H / 8) * i + (Math.random() - 0.5) * 30}`)
    for (let i = 1; i < 12; i++) lines.push(`M${(W / 12) * i} 0 L${(W / 12) * i + (Math.random() - 0.5) * 30} ${H}`)
    return lines
  }, [])

  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="map-canvas" style={{ height, background: '#0a1120' }}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#12224a" />
            <stop offset="100%" stopColor="#0a1120" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#glow)" />
        {roads.map((d, i) => (
          <path key={i} d={d} stroke="#1c2b47" strokeWidth={i % 3 === 0 ? 3 : 1.4} fill="none" />
        ))}

        {/* Routes for moving vehicles */}
        {vehicles.filter((v) => v.route.length > 1).map((v) => {
          const pts = v.route.map(project)
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
          return <path key={`r-${v.id}`} d={d} stroke={STATUS_COLOR[v.status]} strokeOpacity={0.35} strokeWidth={2.5} fill="none" strokeDasharray="6 6" />
        })}

        {/* Vehicle markers */}
        {vehicles.map((v) => {
          const [x, y] = project(v.position)
          const selected = v.id === selectedId
          return (
            <g key={v.id} transform={`translate(${x} ${y})`} style={{ cursor: 'pointer' }} onClick={() => onSelect?.(v.id)}>
              {v.status === 'moving' && <circle r={14} fill={STATUS_COLOR[v.status]} opacity={0.18}><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" /></circle>}
              <circle r={selected ? 11 : 8} fill={STATUS_COLOR[v.status]} stroke={selected ? '#38bdf8' : '#fff'} strokeWidth={selected ? 3 : 2} />
              <text y={-16} textAnchor="middle" fontSize={12} fill="#c8d4ee" fontWeight={600}>{v.name}</text>
            </g>
          )
        })}
      </svg>
      <Legend />
      <div className="map-token-note">Demo map · add a Mapbox token in Settings for satellite/streets</div>
    </div>
  )
}

function Legend() {
  return (
    <div className="map-legend">
      <span className="legend-dot"><i style={{ background: '#22c55e' }} />Moving</span>
      <span className="legend-dot"><i style={{ background: '#f59e0b' }} />Idle</span>
      <span className="legend-dot"><i style={{ background: '#a855f7' }} />Maintenance</span>
      <span className="legend-dot"><i style={{ background: '#64769c' }} />Offline</span>
    </div>
  )
}
