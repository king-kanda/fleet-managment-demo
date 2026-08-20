import type { ReactNode } from 'react'

type Variant = 'trips' | 'inbox' | 'alerts' | 'search'

// Small, on-brand line illustrations — one consistent style (1.6px stroke,
// currentColor, soft tint plate behind). Beats a lone icon-in-a-circle.
const ART: Record<Variant, ReactNode> = {
  trips: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="34" r="4" /><circle cx="36" cy="14" r="4" />
      <path d="M16 34h12a6 6 0 0 0 0-12H20a6 6 0 0 1 0-12h12" strokeDasharray="0.1 5" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" />
      <path d="M8 28h9l3 4h8l3-4h9" />
    </svg>
  ),
  alerts: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 20a10 10 0 0 1 20 0c0 11 5 14 5 14H9s5-3 5-14Z" />
      <path d="M20 40a4 4 0 0 0 8 0" /><path d="M30 8l4-2M18 8l-4-2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="21" cy="21" r="12" /><path d="M30 30l8 8" />
    </svg>
  ),
}

export function EmptyState({ variant = 'inbox', title, hint, action }: {
  variant?: Variant
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-art">{ART[variant]}</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}
