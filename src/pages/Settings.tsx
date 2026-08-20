import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { resetDemo, setMapboxToken, toggleAutoReply, toggleSimulation } from '@/lib/actions'

export function Settings() {
  const state = useStore()
  const [token, setToken] = useState(state.settings.mapboxToken)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setMapboxToken(token)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Settings</h2>
          <div className="sub">Configure the demo and integrations</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Mapbox Integration</h3></div>
          <p className="meta" style={{ marginTop: 0 }}>
            The map works out of the box with a built-in demo renderer. Paste a Mapbox access token to
            upgrade to real streets/satellite tiles. Get a free token at{' '}
            <span style={{ color: 'var(--brand-2)' }}>account.mapbox.com</span>.
          </p>
          <div className="field">
            <label>Mapbox access token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="pk.eyJ1Ijoi…" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn primary" onClick={save}><Icon name="check" size={14} /> Save token</button>
            {state.settings.mapboxToken && <button className="btn ghost" onClick={() => { setToken(''); setMapboxToken('') }}>Clear</button>}
            {saved && <span className="meta" style={{ color: 'var(--green)' }}>Saved ✓</span>}
          </div>
          <div className="meta" style={{ marginTop: 12 }}>
            Status: {state.settings.mapboxToken ? <span style={{ color: 'var(--green)' }}>Live Mapbox tiles active</span> : 'Using built-in demo map'}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>WhatsApp Integration</h3></div>
          <p className="meta" style={{ marginTop: 0 }}>
            In demo mode, driver conversations are fully simulated in the browser. The auto-reply bot
            answers driver keywords (STATUS, ETA, FUEL, ARRIVED). Production wiring for the WhatsApp
            Business Cloud API is stubbed in <code style={{ color: 'var(--brand-2)' }}>src/lib/whatsapp.ts</code>.
          </p>
          <label className="switch" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={state.settings.autoReply} onChange={toggleAutoReply} />
            <span className="track" />
            Auto-reply chatbot
          </label>
        </div>

        <div className="card">
          <div className="card-head"><h3>Simulation</h3></div>
          <p className="meta" style={{ marginTop: 0 }}>
            The live simulation moves vehicles along routes, drains fuel, updates ETAs, and generates
            driver messages and alerts. All state persists to your browser's localStorage.
          </p>
          <label className="switch" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={state.settings.simulationRunning} onChange={toggleSimulation} />
            <span className="track" />
            Live simulation running
          </label>
        </div>

        <div className="card">
          <div className="card-head"><h3>Demo Data</h3></div>
          <p className="meta" style={{ marginTop: 0 }}>
            Reset everything back to the seeded fleet of {state.vehicles.length} vehicles and {state.drivers.length} drivers.
            This clears all trips, messages, and alerts you've created.
          </p>
          <button className="btn danger" onClick={() => { if (confirm('Reset all demo data?')) resetDemo() }}>
            <Icon name="refresh" size={14} /> Reset demo data
          </button>
        </div>
      </div>
    </>
  )
}
