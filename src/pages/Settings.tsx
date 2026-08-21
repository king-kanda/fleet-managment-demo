import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Switch } from '@/components/ui/Switch'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ENV_GROK_API_KEY, ENV_MAPBOX_TOKEN, GROK_API_URL, GROK_MODEL, GROK_USES_PROXY, normalizeGrokKey, normalizeMapboxToken, pingMapboxToken } from '@/lib/env'
import { resetDemo, setGrokApiKey, setGrokModel, setMapboxToken, toggleAiReplies, toggleAutoReply, toggleSimulation } from '@/lib/actions'
import { grokReply } from '@/lib/grok'
import { clearMemory } from '@/lib/memory'

export function Settings() {
  const state = useStore()
  const { toast } = useToast()
  const [token, setToken] = useState(state.settings.mapboxToken)
  const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null)
  const [checking, setChecking] = useState(false)

  const save = () => {
    setMapboxToken(token)
    toast({ title: token.trim() ? 'Mapbox token saved' : 'Mapbox token cleared', description: token.trim() ? 'Live tiles enabled' : 'Using the built-in demo map', variant: 'success' })
  }

  // The token the map is actually using right now: a token saved in this browser
  // wins over the build-time one, which is a common reason a correct Vercel
  // token appears to be ignored.
  const savedToken = normalizeMapboxToken(state.settings.mapboxToken)
  const activeToken = savedToken || ENV_MAPBOX_TOKEN
  const envActive = !savedToken && !!ENV_MAPBOX_TOKEN
  const liveTiles = !!activeToken

  // --- Grok ---------------------------------------------------------------
  const [grokKey, setGrokKey] = useState(state.settings.grokApiKey)
  const [grokModelDraft, setGrokModelDraft] = useState(state.settings.grokModel)
  const [grokCheck, setGrokCheck] = useState<{ ok: boolean; message: string } | null>(null)
  const [grokChecking, setGrokChecking] = useState(false)

  const savedGrokKey = normalizeGrokKey(state.settings.grokApiKey)
  const activeGrok = savedGrokKey || ENV_GROK_API_KEY
  const grokReady = !!activeGrok || GROK_USES_PROXY
  const grokFromEnv = !savedGrokKey && !!ENV_GROK_API_KEY

  const saveGrok = () => {
    setGrokApiKey(grokKey)
    setGrokModel(grokModelDraft)
    toast({
      title: grokKey.trim() ? 'Grok API key saved' : 'Grok API key cleared',
      description: grokKey.trim() ? 'AI replies will use this key' : 'Falling back to the keyword bot',
      variant: 'success',
    })
  }

  const testGrok = async () => {
    setGrokChecking(true)
    setGrokCheck(null)
    const key = grokKey.trim() || state.settings.grokApiKey.trim() || ENV_GROK_API_KEY
    const model = grokModelDraft.trim() || state.settings.grokModel.trim() || GROK_MODEL
    const res = await grokReply(
      {
        driverId: 'test', driverName: 'Test', profile: [], vehicle: [], trip: [], alerts: [], facts: [], transcript: [],
        prompt: 'This is a connectivity test. No driver context is attached.',
      },
      'Reply with the single word: connected.',
      key,
      { model },
    )
    setGrokCheck({
      ok: res.ok,
      message: res.ok ? `Connected — ${model} replied "${res.reply?.slice(0, 60)}"` : (res.error ?? 'Unknown error'),
    })
    setGrokChecking(false)
  }

  const test = async () => {
    setChecking(true)
    setCheck(null)
    const raw = token.trim() || state.settings.mapboxToken.trim() || ENV_MAPBOX_TOKEN
    const res = await pingMapboxToken(raw)
    setCheck({ ok: res.ok, message: res.message })
    setChecking(false)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Settings</h2>
          <div className="sub">Configure the demo and integrations</div>
        </div>
      </div>

      <div className="settings-grid">
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
          <div className="btn-row">
            <button className="btn primary" onClick={save}><Icon name="check" size={14} /> Save token</button>
            <button className="btn ghost" onClick={test} disabled={checking}>{checking ? 'Testing…' : 'Test token'}</button>
            {state.settings.mapboxToken && <button className="btn ghost" onClick={() => { setToken(''); setMapboxToken(''); setCheck(null) }}>Clear</button>}
          </div>
          {check && (
            <div className="status-row" style={{ marginTop: 12, alignItems: 'flex-start', lineHeight: 1.5 }}>
              <span className={`status-dot ${check.ok ? 'on' : ''}`} />
              <span>{check.message}</span>
            </div>
          )}
          <div className="status-row" style={{ marginTop: 14 }}>
            <span className={`status-dot ${liveTiles ? 'on' : ''}`} />
            {liveTiles
              ? <>Live Mapbox tiles active{envActive ? ' (from VITE_MAPBOX_TOKEN)' : ' (saved in this browser)'}</>
              : 'Using the free OpenStreetMap basemap'}
          </div>
          {savedToken && !!ENV_MAPBOX_TOKEN && (
            <div className="meta" style={{ marginTop: 8, lineHeight: 1.5 }}>
              A token saved in this browser is overriding <code>VITE_MAPBOX_TOKEN</code>. Clear it to use the deployed one.
            </div>
          )}
          {!ENV_MAPBOX_TOKEN && (
            <div className="meta" style={{ marginTop: 8, lineHeight: 1.5 }}>
              No build-time token in this deployment. <code>VITE_MAPBOX_TOKEN</code> is inlined when the app is built —
              set it for the Production environment in Vercel and redeploy.
            </div>
          )}
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
          <div className="card-head"><h3>Grok AI replies</h3></div>
          <p className="meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
            When enabled, driver messages are answered by <strong>Grok</strong> instead of the keyword bot.
            Each conversation is condensed into a memory object — driver profile, vehicle telemetry, active
            trip, open alerts, remembered facts and the recent transcript — and that is what the model is
            given as context. Open any thread's <strong>Context</strong> panel to see exactly what is sent.
          </p>
          <div className="field">
            <label>xAI API key</label>
            <input
              type="password"
              value={grokKey}
              onChange={(e) => setGrokKey(e.target.value)}
              placeholder={grokFromEnv ? 'Using VITE_GROK_API_KEY from env' : 'xai-…'}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>Model</label>
            <input value={grokModelDraft} onChange={(e) => setGrokModelDraft(e.target.value)} placeholder={GROK_MODEL} />
          </div>
          <div className="btn-row">
            <button className="btn primary" onClick={saveGrok}><Icon name="check" size={14} /> Save</button>
            <button className="btn ghost" onClick={testGrok} disabled={grokChecking}>{grokChecking ? 'Testing…' : 'Test connection'}</button>
            {state.settings.grokApiKey && <button className="btn ghost" onClick={() => { setGrokKey(''); setGrokApiKey(''); setGrokCheck(null) }}>Clear</button>}
          </div>
          {grokCheck && (
            <div className="status-row" style={{ marginTop: 12, alignItems: 'flex-start', lineHeight: 1.5 }}>
              <span className={`status-dot ${grokCheck.ok ? 'on' : ''}`} />
              <span style={{ wordBreak: 'break-word' }}>{grokCheck.message}</span>
            </div>
          )}
          <div className="setting-toggle" style={{ marginTop: 14 }}>
            <div>
              <div className="setting-title">Use Grok for replies</div>
              <div className="meta">Off = deterministic keyword bot only</div>
            </div>
            <Switch checked={state.settings.aiReplies} onCheckedChange={toggleAiReplies} />
          </div>
          <div className="status-row" style={{ marginTop: 12 }}>
            <span className={`status-dot ${grokReady && state.settings.aiReplies ? 'on' : ''}`} />
            {!grokReady
              ? 'No key configured — replies come from the keyword bot'
              : state.settings.aiReplies
                ? <>AI replies active via {GROK_USES_PROXY ? 'your proxy' : 'api.x.ai'}{grokFromEnv ? ' (key from VITE_GROK_API_KEY)' : ''}</>
                : 'Key configured, but AI replies are switched off'}
          </div>
          <div className="meta" style={{ marginTop: 8, lineHeight: 1.5 }}>
            {GROK_USES_PROXY
              ? <>Requests go to <code>{GROK_API_URL}</code>.</>
              : <>A key entered here or in <code>VITE_GROK_API_KEY</code> is visible to anyone who opens this
                site. Use a spend-capped demo key, or set <code>VITE_GROK_PROXY_URL</code> to a backend that
                holds the key server-side.</>}
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => { clearMemory(); toast({ title: 'Conversation memory cleared', description: 'Remembered facts removed for all drivers', variant: 'success' }) }}>
              Clear conversation memory
            </button>
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
