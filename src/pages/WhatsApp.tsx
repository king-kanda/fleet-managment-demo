import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from '@/hooks/useStore'
import { Icon } from '@/components/Icon'
import { Switch } from '@/components/ui/Switch'
import { activeGrokKey, getLastGrokError, receiveMessage, sendMessage, toggleAutoReply } from '@/lib/actions'
import { grokConfigured } from '@/lib/grok'
import { buildMemory } from '@/lib/memory'
import { typingStore } from '@/lib/typing'
import { clockTime, initials } from '@/lib/format'
import type { WhatsAppMessage } from '@/lib/types'

const QUICK = ['STATUS', 'ETA', 'FUEL', 'ARRIVED', 'MENU']

// Free-text prompts that show off context-aware replies rather than keywords.
const SCENARIO_PROMPTS = [
  'The engine is making a strange noise, should I continue?',
  'How far am I from the drop-off?',
  'I am stuck in traffic, will the client be told?',
  'Can I take my break now?',
]

export function WhatsApp() {
  const state = useStore()
  const [activeDriver, setActiveDriver] = useState<string | null>(state.drivers[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const [showContext, setShowContext] = useState(false)
  // On phones the list and the thread are two screens, not two columns.
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list')
  const endRef = useRef<HTMLDivElement>(null)

  const typing = useSyncExternalStore(typingStore.subscribe, typingStore.get)

  const conversations = useMemo(() => {
    return state.drivers
      .map((d) => {
        const msgs = state.messages.filter((m) => m.driverId === d.id)
        const last = msgs[msgs.length - 1]
        const lastOut = Math.max(0, ...msgs.filter((m) => m.direction === 'outbound').map((m) => m.createdAt))
        const unread = msgs.filter((m) => m.direction === 'inbound' && m.createdAt > lastOut).length
        return { driver: d, last, unread, count: msgs.length }
      })
      // Drivers with history first, most recent message at the top.
      .sort((a, b) => (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0))
  }, [state.drivers, state.messages])

  const thread = state.messages.filter((m) => m.driverId === activeDriver)
  const driver = state.drivers.find((d) => d.id === activeDriver)
  const isTyping = !!activeDriver && typing.includes(activeDriver)
  const aiActive = state.settings.autoReply && state.settings.aiReplies && grokConfigured(activeGrokKey(state))

  const memory = useMemo(
    () => (showContext && activeDriver ? buildMemory(state, activeDriver) : null),
    [showContext, activeDriver, state],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, activeDriver, isTyping])

  const openConversation = (id: string) => {
    setActiveDriver(id)
    setMobilePane('thread')
    setShowContext(false)
  }

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

      <div className={`wa-layout pane-${mobilePane}`}>
        <div className="card wa-list" style={{ padding: 6 }}>
          {conversations.map(({ driver: d, last, unread }) => (
            <button
              key={d.id}
              className={`wa-conv ${activeDriver === d.id ? 'active' : ''}`}
              onClick={() => openConversation(d.id)}
            >
              <div className="avatar" style={{ background: d.avatarColor }}>{initials(d.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="wa-conv-name">{d.name}</div>
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
                <button className="icon-btn wa-back" onClick={() => setMobilePane('list')} aria-label="Back to conversations">
                  <Icon name="chevronLeft" size={18} />
                </button>
                <div className="avatar" style={{ background: driver.avatarColor }}>{initials(driver.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{driver.name}</div>
                  <div className="meta wa-head-meta">{driver.phone} · <span className={`pill ${driver.status}`}>{driver.status.replace('_', ' ')}</span></div>
                </div>
                <button
                  className={`btn sm ghost wa-context-btn ${showContext ? 'active' : ''}`}
                  onClick={() => setShowContext((v) => !v)}
                  title="Show the memory object sent to Grok"
                >
                  <Icon name="chat" size={14} /> Context
                </button>
              </div>

              {showContext && memory && <ContextPanel prompt={memory.prompt} factCount={memory.facts.length} aiActive={aiActive} />}

              <div className="wa-messages">
                {thread.length === 0 && <div className="wa-empty">No messages yet. Say hello 👋</div>}
                {thread.map((m) => <Bubble key={m.id} m={m} />)}
                {isTyping && (
                  <div className="bubble outbound typing" aria-live="polite">
                    <span className="typing-dots"><i /><i /><i /></span>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="quick-cmds">
                <span className="meta quick-label">Simulate driver reply:</span>
                {QUICK.map((q) => (
                  <button key={q} onClick={() => activeDriver && receiveMessage(activeDriver, q)}>{q}</button>
                ))}
                {aiActive && SCENARIO_PROMPTS.map((q) => (
                  <button key={q} className="quick-long" title={q} onClick={() => activeDriver && receiveMessage(activeDriver, q)}>
                    {q.length > 28 ? `${q.slice(0, 28)}…` : q}
                  </button>
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

/** Shows exactly what memory is handed to the model for this conversation. */
function ContextPanel({ prompt, factCount, aiActive }: { prompt: string; factCount: number; aiActive: boolean }) {
  const error = getLastGrokError()
  return (
    <div className="wa-context">
      <div className="wa-context-head">
        <strong>Memory sent to Grok</strong>
        <span className="meta">{factCount} remembered fact{factCount === 1 ? '' : 's'}</span>
      </div>
      {!aiActive && (
        <div className="meta wa-context-note">
          AI replies are off or unconfigured — replies currently come from the keyword bot. This is what
          <em> would</em> be sent.
        </div>
      )}
      {error && <div className="meta wa-context-note error">Last AI attempt failed: {error}</div>}
      <pre className="wa-context-body">{prompt}</pre>
    </div>
  )
}

function Bubble({ m }: { m: WhatsAppMessage }) {
  const ticks = m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'
  return (
    <div className={`bubble ${m.direction}`}>
      {m.automated && <div className="bot-tag">{m.source === 'grok' ? '✨ Grok reply' : '🤖 Auto dispatch'}</div>}
      {m.body}
      <div className="b-time">
        {clockTime(m.createdAt)}
        {m.direction === 'outbound' && <span style={{ marginLeft: 4, color: m.status === 'read' ? '#53bdeb' : undefined }}>{ticks}</span>}
      </div>
    </div>
  )
}
