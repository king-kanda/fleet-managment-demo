import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { signIn } from '@/lib/auth'

const DEMO_EMAIL = 'dispatch@fleetpulse.io'
const DEMO_PASSWORD = 'demo1234'

export function Login() {
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter an email and password to continue.')
      return
    }
    signIn(email.trim())
  }

  return (
    <div className="login">
      <div className="login-aside">
        <div className="login-brand">
          <div className="brand">
            <div className="logo"><Icon name="truck" size={19} style={{ color: '#fff' }} /></div>
            <div>
              <h1 style={{ color: '#fff' }}>FleetPulse</h1>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fleet Management</span>
            </div>
          </div>
        </div>
        <div className="login-aside-body">
          <h2>Run your entire fleet from one screen.</h2>
          <p>Live GPS tracking, trip dispatch, and two-way WhatsApp messaging with every driver — in real time.</p>
          <ul className="login-feats">
            <li><Icon name="map" size={16} /> Real-time Mapbox fleet tracking</li>
            <li><Icon name="chat" size={16} /> WhatsApp dispatch &amp; driver chat</li>
            <li><Icon name="route" size={16} /> Trip assignment with live ETAs</li>
            <li><Icon name="users" size={16} /> Driver &amp; vehicle management</li>
          </ul>
        </div>
        <div className="login-aside-foot">© {new Date().getFullYear()} FleetPulse · Demo environment</div>
      </div>

      <div className="login-main">
        <form className="login-form" onSubmit={submit}>
          <h2>Welcome back</h2>
          <p className="login-sub">Sign in to your dispatch dashboard.</p>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className="input-icon">
              <Icon name="mail" size={16} />
              <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="you@company.com" autoComplete="username" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-icon">
              <Icon name="lock" size={16} />
              <input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password">
                <Icon name="eye" size={16} />
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}>
            Sign in
          </button>

          <div className="demo-hint">
            <Icon name="sparkles" size={14} />
            <div>
              <strong>Demo mode</strong> — pre-filled credentials work, or use any email. No account needed.
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
