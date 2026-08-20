import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Switch } from '@/components/ui/Switch'
import { receiveMessage, sendMessage, toggleAutoReply } from '@/lib/actions'
import { clockTime, initials } from '@/lib/format'
import type { WhatsAppMessage } from '@/lib/types'

const QUICK = ['STATUS', 'ETA', 'FUEL', 'ARRIVED', 'MENU']

export function WhatsApp() {
  const state = useStore()
  const [activeDriver, setActiveDriver] = useState<string | null>(state.drivers[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const conversations = useMemo(() => {
    return state.drivers
      .map((d) => {
        const msgs = state.messages.filter((m) => m.driverId === d.id)
        const last = msgs[msgs.length - 1]
        const lastOut = Math.max(0, ...msgs.filter((m) => m.direction === 'outbound').map((m) => m.createdAt))
        const unread = msgs.filter((m) => m.direction === 'inbound' && m.createdAt > lastOut).length
        return { driver: d, last, unread, count: msgs.length }
      })
      .sort((a, b) => (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0))
  }, [state.drivers, state.messages])

  const thread = state.messages.filter((m) => m.driverId === activeDriver)
  const driver = state.drivers.find((d) => d.id === activeDriver)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, activeDriver])

  const send = () => {
    if (!draft.trim() || !activeDriver) return
    sendMessage(activeDriver, draft.trim())
    setDraft('')
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h2>WhatsApp Dispatch</h2>
          <div className="sub">Two-way messaging with drivers · powered by WhatsApp Business Cloud API</div>
        </div>
        <div className="topbar-actions">
          <Switch checked={state.settings.autoReply} onCheckedChange={toggleAutoReply} label="Auto-reply bot" id="autoreply" />
        </div>
      </div>

      <div className="wa-layout">
        <div className="card wa-list" style={{ padding: 6 }}>
          {conversations.map(({ driver: d, last, unread }) => (
            <button
              key={d.id}
              className={`wa-conv ${activeDriver === d.id ? 'active' : ''}`}
              onClick={() => setActiveDriver(d.id)}
            >
              <div className="avatar" style={{ background: d.avatarColor }}>{initials(d.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
                <div className="last">{last ? (last.direction === 'inbound' ? '' : '✓ ') + last.body : 'No messages yet'}</div>
              </div>
              {unread > 0 && <span className="unread">{unread}</span>}
            </button>
          ))}
        </div>

        <div className="wa-thread">
          {driver ? (
            <>
              <div className="wa-thread-head">
                <div className="avatar" style={{ background: driver.avatarColor }}>{initials(driver.name)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{driver.name}</div>
                  <div className="meta">{driver.phone} · <span className={`pill ${driver.status}`}>{driver.status.replace('_', ' ')}</span></div>
                </div>
              </div>

              <div className="wa-messages">
                {thread.length === 0 && <div className="wa-empty">No messages yet. Say hello 👋</div>}
                {thread.map((m) => <Bubble key={m.id} m={m} />)}
                <div ref={endRef} />
              </div>

              <div className="quick-cmds">
                <span className="meta" style={{ alignSelf: 'center', marginRight: 4 }}>Simulate driver reply:</span>
                {QUICK.map((q) => (
                  <button key={q} onClick={() => activeDriver && receiveMessage(activeDriver, q)}>{q}</button>
                ))}
              </div>

              <div className="wa-compose">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a message to the driver…"
                />
                <button className="wa-send" onClick={send} aria-label="Send">
                  <Icon name="send" size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="wa-empty">Select a conversation.</div>
          )}
        </div>
      </div>
    </>
  )
}

function Bubble({ m }: { m: WhatsAppMessage }) {
  const ticks = m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'
  return (
    <div className={`bubble ${m.direction}`}>
      {m.automated && <div className="bot-tag">🤖 Auto dispatch</div>}
      {m.body}
      <div className="b-time">
        {clockTime(m.createdAt)}
        {m.direction === 'outbound' && <span style={{ marginLeft: 4, color: m.status === 'read' ? '#53bdeb' : undefined }}>{ticks}</span>}
      </div>
    </div>
  )
}
