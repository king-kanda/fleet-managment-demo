import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Icon } from './Icon'
import { useAuth } from '@/lib/auth'
import { markOnboarded, useOnboarded } from '@/lib/onboarding'

interface TourStep {
  selector: string
  title: string
  body: string
}

const STEPS: TourStep[] = [
  { selector: '[data-tour="nav"]', title: 'Navigate the workspace', body: 'Jump between the live dashboard, map, trips, and your fleet & driver rosters from here.' },
  { selector: '[data-tour="kpis"]', title: 'Real-time KPIs', body: 'Fleet utilization, deliveries, on-time rate and distance — each with a 14-day trend. They update live as the simulation runs.' },
  { selector: '[data-tour="map"]', title: 'Live fleet map', body: 'Every vehicle is tracked in real time on an interactive map. Click a vehicle to see its trip, speed and driver.' },
  { selector: '[data-tour="whatsapp"]', title: 'WhatsApp dispatch', body: 'Message any driver two-way over WhatsApp. The auto-reply bot answers driver keywords like STATUS and ETA.' },
  { selector: '[data-tour="account"]', title: 'That’s it!', body: 'Everything here is yours to explore. Open Settings any time to reset the demo or add a Mapbox token.' },
]

/** Orchestrates the post-login welcome dialog and the guided tour. */
export function Onboarding() {
  const user = useAuth()
  const onboarded = useOnboarded()
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [tourStep, setTourStep] = useState<number | null>(null)

  useEffect(() => {
    if (user && !onboarded) {
      const t = setTimeout(() => setWelcomeOpen(true), 650)
      return () => clearTimeout(t)
    }
  }, [user, onboarded])

  // Expose a global replay hook for the user menu.
  useEffect(() => {
    ;(window as unknown as { __startTour?: () => void }).__startTour = () => setTourStep(0)
    return () => { delete (window as unknown as { __startTour?: () => void }).__startTour }
  }, [])

  const startTour = () => { setWelcomeOpen(false); markOnboarded(); setTimeout(() => setTourStep(0), 250) }
  const dismiss = () => { setWelcomeOpen(false); markOnboarded() }

  if (!user) return null

  return (
    <>
      <WelcomeDialog open={welcomeOpen} onTour={startTour} onDismiss={dismiss} name={user.name.split(' ')[0]} />
      {tourStep !== null && (
        <Tour
          step={tourStep}
          onNext={() => setTourStep((s) => (s! < STEPS.length - 1 ? s! + 1 : null))}
          onBack={() => setTourStep((s) => Math.max(0, s! - 1))}
          onClose={() => setTourStep(null)}
        />
      )}
    </>
  )
}

function WelcomeDialog({ open, onTour, onDismiss, name }: { open: boolean; onTour: () => void; onDismiss: () => void; name: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content welcome-card">
          <div className="welcome-badge"><Icon name="sparkles" size={22} /></div>
          <DialogPrimitive.Title className="welcome-title">Welcome to the FleetPulse demo, {name} 👋</DialogPrimitive.Title>
          <DialogPrimitive.Description className="welcome-desc">
            You’re in a fully interactive <b>demo environment</b> that simulates how the real system works —
            live vehicle tracking, trip dispatch and two-way WhatsApp messaging, all running in your browser.
          </DialogPrimitive.Description>
          <div className="welcome-points">
            <div className="welcome-point"><Icon name="check" size={15} /><span>Everything is simulated with realistic sample data — no real vehicles or messages.</span></div>
            <div className="welcome-point"><Icon name="check" size={15} /><span>Feel free to <b>break things</b> and use it however you like — reset any time from Settings.</span></div>
            <div className="welcome-point"><Icon name="check" size={15} /><span>Spotted something? We’d love your <b>feedback</b>.</span></div>
          </div>
          <div className="welcome-actions">
            <button className="btn ghost" onClick={onDismiss}>Explore on my own</button>
            <button className="btn primary" onClick={onTour}><Icon name="sparkles" size={15} /> Take a quick tour</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Tour({ step, onNext, onBack, onClose }: { step: number; onNext: () => void; onBack: () => void; onClose: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const current = STEPS[step]

  const measure = useCallback(() => {
    const el = document.querySelector(current.selector)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }
  }, [current.selector])

  useLayoutEffect(() => {
    measure()
    const t = setTimeout(measure, 260) // after any scroll settles
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  const pad = 6
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null

  // Position the tooltip: prefer below the target, flip above if not enough room.
  const tipW = 320
  let tipStyle: React.CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  if (spot) {
    const below = spot.top + spot.height + 12
    const roomBelow = window.innerHeight - below > 190
    const top = roomBelow ? below : Math.max(12, spot.top - 12 - 180)
    let left = spot.left + spot.width / 2 - tipW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - tipW - 12))
    tipStyle = { top, left, width: tipW, transform: 'none' }
  }

  return (
    <div className="tour-layer">
      {spot && <div className="tour-spot" style={spot} />}
      <div className="tour-tip" style={tipStyle} ref={tipRef}>
        <div className="tour-step-count">Step {step + 1} of {STEPS.length}</div>
        <div className="tour-title">{current.title}</div>
        <div className="tour-body">{current.body}</div>
        <div className="tour-nav">
          <div className="tour-dots">
            {STEPS.map((_, i) => <span key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />)}
          </div>
          <div className="tour-btns">
            <button className="btn ghost sm" onClick={onClose}>Skip</button>
            {step > 0 && <button className="btn sm" onClick={onBack}>Back</button>}
            <button className="btn primary sm" onClick={onNext}>{step === STEPS.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
