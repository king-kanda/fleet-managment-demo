import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Switch } from '@/components/ui/Switch'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ENV_MAPBOX_TOKEN } from '@/lib/env'
import { resetDemo, setMapboxToken, toggleAutoReply, toggleSimulation } from '@/lib/actions'

export function Settings() {
  const state = useStore()
  const { toast } = useToast()
  const [token, setToken] = useState(state.settings.mapboxToken)

  const save = () => {
    setMapboxToken(token)
    toast({ title: token.trim() ? 'Mapbox token saved' : 'Mapbox token cleared', description: token.trim() ? 'Live tiles enabled' : 'Using the built-in demo map', variant: 'success' })
  }

  const envActive = !state.settings.mapboxToken && !!ENV_MAPBOX_TOKEN
  const liveTiles = !!(state.settings.mapboxToken || ENV_MAPBOX_TOKEN)

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Settings</h2>
          <div className="sub">Configure the demo and integrations</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Mapbox Integration</h3></div>
          <p className="meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
            The map works out of the box with a built-in renderer. Paste a Mapbox access token to
            upgrade to real streets/satellite tiles. Get a free token at{' '}
            <span style={{ color: 'var(--brand)', fontWeight: 550 }}>account.mapbox.com</span>. You can also set
            it at build time via <code>VITE_MAPBOX_TOKEN</code>.
          </p>
          <div className="field">
            <label>Mapbox access token</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder={envActive ? 'Using VITE_MAPBOX_TOKEN from env' : 'pk.eyJ1Ijoi…'} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn primary" onClick={save}><Icon name="check" size={14} /> Save token</button>
            {state.settings.mapboxToken && <button className="btn ghost" onClick={() => { setToken(''); setMapboxToken('') }}>Clear</button>}
          </div>
          <div className="status-row" style={{ marginTop: 14 }}>
            <span className={`status-dot ${liveTiles ? 'on' : ''}`} />
            {liveTiles
              ? <>Live Mapbox tiles active{envActive ? ' (from environment)' : ''}</>
              : 'Using built-in demo map'}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>WhatsApp Integration</h3></div>
          <p className="meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
            In demo mode, driver conversations are fully simulated in the browser. The auto-reply bot
            answers driver keywords (STATUS, ETA, FUEL, ARRIVED). Production wiring for the WhatsApp
            Business Cloud API is stubbed in <code>src/lib/whatsapp.ts</code>.
          </p>
          <div className="setting-toggle">
            <div>
              <div className="setting-title">Auto-reply chatbot</div>
              <div className="meta">Automatically respond to driver keywords</div>
            </div>
            <Switch checked={state.settings.autoReply} onCheckedChange={toggleAutoReply} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Simulation</h3></div>
          <p className="meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
            The live simulation moves vehicles along routes, drains fuel, updates ETAs, and generates
            driver messages and alerts. All state persists to your browser's localStorage.
          </p>
          <div className="setting-toggle">
            <div>
              <div className="setting-title">Live simulation</div>
              <div className="meta">Advance the fleet in real time</div>
            </div>
            <Switch checked={state.settings.simulationRunning} onCheckedChange={toggleSimulation} />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Demo Data</h3></div>
          <p className="meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
            Reset everything back to the seeded fleet of {state.vehicles.length} vehicles and {state.drivers.length} drivers.
            This clears all trips, messages, and alerts you've created.
          </p>
          <ConfirmDialog
            trigger={<button className="btn danger"><Icon name="refresh" size={14} /> Reset demo data</button>}
            title="Reset all demo data?"
            description="This restores the original seeded fleet and clears everything you've created. This cannot be undone."
            confirmLabel="Reset data"
            destructive
            onConfirm={() => { resetDemo(); toast({ title: 'Demo data reset', description: 'Fleet restored to defaults', variant: 'success' }) }}
          />
        </div>
      </div>
    </>
  )
}
