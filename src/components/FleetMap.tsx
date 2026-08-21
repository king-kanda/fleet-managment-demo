import { useEffect, useMemo, useRef, useState } from 'react'
import type { Vehicle, LngLat } from '@/lib/types'
import { MAP_CENTER, MAP_ZOOM } from '@/data/seed'
import { normalizeMapboxToken } from '@/lib/env'
import { markerSVG, VEHICLE_SHAPES } from './vehicleMarker'

interface Props {
  vehicles: Vehicle[]
  token: string
  height?: number
  fill?: boolean // stretch to fill the parent (full-screen map)
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  moving: '#0f9d63',
  idle: '#c77700',
  offline: '#64748b',
  maintenance: '#7c5cf0',
}

// Free, no-token RASTER basemap. OpenStreetMap's standard tiles are the most
// reliable keyless source — CORS-enabled and battle-tested — so the real map
// (streets + town names) renders in production. A Mapbox token upgrades to it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OSM_RASTER_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// Rendering modes, best first. We only ever step DOWN one rung at a time, and
// only for a failure that rung cannot recover from:
//   mapbox → Mapbox streets (needs a valid public token)
//   free   → MapLibre + OpenStreetMap raster tiles (no token, still a real map)
//   svg    → the schematic offline preview (no map library at all)
type Mode = 'mapbox' | 'free' | 'svg'

export function FleetMap(props: Props) {
  // Trim/validate first: a token with a stray newline or quotes from the Vercel
  // dashboard is a 401 waiting to happen, and an sk./garbage token can never
  // work in a browser — treat those as "no token" and use the free basemap.
  const token = useMemo(() => normalizeMapboxToken(props.token), [props.token])
  const [mode, setMode] = useState<Mode>(token ? 'mapbox' : 'free')
  const [note, setNote] = useState('')

  // A new token gets a fresh shot at the best rung.
  useEffect(() => {
    setMode(token ? 'mapbox' : 'free')
    setNote('')
  }, [token])

  const downgrade = (to: Mode, reason: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[FleetMap] falling back to "${to}" basemap: ${reason}`)
    setNote(reason)
    setMode(to)
  }

  if (mode === 'svg') return <SvgMap {...props} note={note} />
  // Remount on mode change so the map is rebuilt with the new style/library.
  return <GLMap {...props} key={mode} token={token} mode={mode} note={note} onDowngrade={downgrade} />
}

// ---------------------------------------------------------------------------
// GL map. Mapbox streets when a valid token is supplied, otherwise MapLibre +
// free OSM raster tiles. Renders live vehicle markers + active route lines.
// ---------------------------------------------------------------------------
function GLMap({
  vehicles, token, height = 460, fill, selectedId, onSelect, mode, note, onDowngrade,
}: Props & { mode: Mode; note: string; onDowngrade: (to: Mode, reason: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({})
  const loadedRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    let cancelled = false
    const usingMapbox = mode === 'mapbox'
    ;(async () => {
      try {
        // With a token, use the official mapbox-gl (native mapbox:// support for
        // tiles, glyphs and sprites). Without one, use maplibre-gl + free OSM.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let gl: any
        if (usingMapbox) {
          gl = (await import('mapbox-gl')).default
          await import('mapbox-gl/dist/mapbox-gl.css')
          gl.accessToken = token
        } else {
          const mod = await import('maplibre-gl')
          gl = (mod as { default?: unknown }).default ?? mod
          await import('maplibre-gl/dist/maplibre-gl.css')
        }
        if (cancelled || !containerRef.current) return
        glRef.current = gl

        const style = usingMapbox ? 'mapbox://styles/mapbox/streets-v12' : OSM_RASTER_STYLE

        const map = new gl.Map({
          container: containerRef.current,
          style,
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
          attributionControl: false,
        })
        mapRef.current = map
        map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right')

        // A blank map is worse than a plain one: if Mapbox refuses the token or
        // the style cannot be fetched, step down to the free OSM basemap instead
        // of leaving the user staring at grey tiles.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('error', (e: any) => {
          if (cancelled || !usingMapbox || loadedRef.current) return
          const status: number | undefined = e?.error?.status
          const msg: string = e?.error?.message ?? String(e?.error ?? 'unknown error')
          const authFailure = status === 401 || status === 403 || /access token|unauthorized|forbidden/i.test(msg)
          const styleFailure = /style|failed to fetch/i.test(msg)
          if (!authFailure && !styleFailure) return
          onDowngrade(
            'free',
            authFailure
              ? `Mapbox rejected the access token (${status ?? 'auth error'}) — showing the free OpenStreetMap basemap. Check VITE_MAPBOX_TOKEN and any URL restriction on it.`
              : `Could not load the Mapbox style (${msg}) — showing the free OpenStreetMap basemap.`,
          )
        })

        map.on('load', () => {
          loadedRef.current = true
          map.addSource('routes', { type: 'geojson', data: routeGeoJSON(vehicles) })
          map.addLayer({
            id: 'routes',
            type: 'line',
            source: 'routes',
            paint: { 'line-color': '#4f46e5', 'line-width': 2.5, 'line-opacity': 0.4, 'line-dasharray': [2, 2] },
          })
          syncMarkers()
          // Frame the whole fleet (spread across counties) on first load.
          if (!fill) return
          const pts = vehicles.map((v) => v.position)
          if (pts.length > 1) {
            const b = pts.reduce((acc, p) => acc.extend(p), new gl.LngLatBounds(pts[0], pts[0]))
            map.fitBounds(b, { padding: { top: 90, bottom: 60, left: 320, right: 340 }, maxZoom: 11, duration: 0 })
          }
        })
        // A working map is never torn down for tile errors. The offline SVG is
        // only reached if the map library itself fails to load or start (catch).
      } catch (e) {
        if (cancelled) return
        const reason = `${usingMapbox ? 'mapbox-gl' : 'maplibre-gl'} failed to start: ${String(e)}`
        // mapbox-gl failing to load (chunk error, WebGL refused) is no reason to
        // give up on maps entirely — try the free renderer before the SVG.
        onDowngrade(usingMapbox ? 'free' : 'svg', reason)
      }
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = {}
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const syncMarkers = () => {
    const map = mapRef.current
    const maplibregl = glRef.current
    if (!map || !maplibregl) return
    vehicles.forEach((v) => {
      let marker = markersRef.current[v.id]
      if (!marker) {
        const el = document.createElement('div')
        el.className = 'veh-marker'
        el.innerHTML = markerSVG(v.type) // car / truck / van / bike silhouette
        el.addEventListener('click', () => onSelectRef.current?.(v.id))
        marker = new maplibregl.Marker({ element: el }).setLngLat(v.position).addTo(map)
        markersRef.current[v.id] = marker
      }
      marker.setLngLat(v.position)
      const el = marker.getElement() as HTMLDivElement
      el.style.color = STATUS_COLOR[v.status]
      el.classList.toggle('selected', v.id === selectedId)
      el.classList.toggle('moving', v.status === 'moving')
    })
  }

  useEffect(() => {
    if (loadedRef.current) {
      syncMarkers()
      mapRef.current?.getSource('routes')?.setData(routeGeoJSON(vehicles))
    }
  })

  // Fly to a vehicle when it becomes the selection (e.g. clicked in a list).
  useEffect(() => {
    if (!loadedRef.current || !selectedId) return
    const v = vehicles.find((x) => x.id === selectedId)
    if (v) mapRef.current?.flyTo({ center: v.position, zoom: 13.5, duration: 700 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return (
    <div className={`map-wrap ${fill ? 'map-fill' : ''}`}>
      <div ref={containerRef} className="map-canvas" style={fill ? { height: '100%' } : { height }} />
      <Legend />
      {/* Only ever shown to explain a downgrade — a working map carries no badge. */}
      {mode === 'free' && note && (
        <div className="map-token-note" title={note}>OpenStreetMap basemap · {note}</div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function routeGeoJSON(vehicles: Vehicle[]): any {
  return {
    type: 'FeatureCollection',
    features: vehicles
      .filter((v) => v.status === 'moving' && v.route.length > 1)
      .map((v) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: v.route }, properties: {} })),
  }
}

// ---------------------------------------------------------------------------
// SVG fallback — only used if the map library/tiles cannot load (offline).
// ---------------------------------------------------------------------------
function SvgMap({ vehicles, height = 460, fill, selectedId, onSelect, note }: Props & { note?: string }) {
  const bounds = useMemo(() => ({ minLng: 36.35, maxLng: 37.35, minLat: -1.95, maxLat: -0.62 }), [])
  const W = 1000
  const H = 560
  const project = (c: LngLat): [number, number] => {
    const x = ((c[0] - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * W
    const y = (1 - (c[1] - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * H
    return [x, y]
  }
  const roads = useMemo(() => {
    const lines: string[] = []
    for (let i = 1; i < 8; i++) lines.push(`M0 ${(H / 8) * i} L${W} ${(H / 8) * i + (Math.random() - 0.5) * 30}`)
    for (let i = 1; i < 12; i++) lines.push(`M${(W / 12) * i} 0 L${(W / 12) * i + (Math.random() - 0.5) * 30} ${H}`)
    return lines
  }, [])

  return (
    <div className={`map-wrap ${fill ? 'map-fill' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="map-canvas" style={{ height: fill ? '100%' : height, background: '#eef1f5' }}>
        <rect width={W} height={H} fill="#e7ebf1" />
        {roads.map((d, i) => (
          <path key={i} d={d} stroke="#dfe3ea" strokeWidth={i % 3 === 0 ? 5 : 2} fill="none" strokeLinecap="round" />
        ))}
        {vehicles.filter((v) => v.route.length > 1 && v.status === 'moving').map((v) => {
          const pts = v.route.map(project)
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
          return <path key={`r-${v.id}`} d={d} stroke={STATUS_COLOR[v.status]} strokeOpacity={0.45} strokeWidth={2.5} fill="none" strokeDasharray="7 7" />
        })}
        {vehicles.map((v) => {
          const [x, y] = project(v.position)
          const selected = v.id === selectedId
          const c = STATUS_COLOR[v.status]
          return (
            <g key={v.id} transform={`translate(${x} ${y})`} style={{ cursor: 'pointer' }} onClick={() => onSelect?.(v.id)}>
              {v.status === 'moving' && <circle r={16} fill={c} opacity={0.14} />}
              <circle r={selected ? 14 : 12} fill="#fff" stroke={selected ? '#4f46e5' : c} strokeWidth={selected ? 3 : 2} />
              <g transform="translate(-9 -9) scale(0.75)" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: VEHICLE_SHAPES[v.type] }} />
            </g>
          )
        })}
      </svg>
      <Legend />
      <div className="map-token-note" title={note || undefined}>Offline map preview{note ? ` · ${note}` : ''}</div>
    </div>
  )
}

function Legend() {
  return (
    <div className="map-legend">
      <span className="legend-dot"><i style={{ background: '#0f9d63' }} />Moving</span>
      <span className="legend-dot"><i style={{ background: '#c77700' }} />Idle</span>
      <span className="legend-dot"><i style={{ background: '#7c5cf0' }} />Maintenance</span>
      <span className="legend-dot"><i style={{ background: '#64748b' }} />Offline</span>
    </div>
  )
}
