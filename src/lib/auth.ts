import { useSyncExternalStore } from 'react'

// Demo-only auth. There is no server or real credential check — this simply
// gates the UI and remembers the "signed in" user in localStorage so a refresh
// keeps you logged in. Any email/password is accepted (see Login screen).

const KEY = 'fleetpulse.auth.v1'

export interface AuthUser {
  name: string
  email: string
  role: string
}

let current: AuthUser | null = load()
const listeners = new Set<() => void>()

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function signIn(email: string, name?: string): AuthUser {
  const derivedName =
    name?.trim() ||
    email
      .split('@')[0]
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
  current = { name: derivedName || 'Fleet Manager', email, role: 'Operations Manager' }
  localStorage.setItem(KEY, JSON.stringify(current))
  emit()
  return current
}

export function signOut() {
  current = null
  localStorage.removeItem(KEY)
  emit()
}

export function useAuth(): AuthUser | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
