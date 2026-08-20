import { useSyncExternalStore } from 'react'

// Tracks whether the user has seen the welcome/tour. Persisted so it only
// appears once, but replayable from the user menu.
const KEY = 'fleetpulse.onboarded.v1'
const listeners = new Set<() => void>()
let seen = localStorage.getItem(KEY) === '1'

function emit() {
  listeners.forEach((l) => l())
}

export function markOnboarded() {
  seen = true
  localStorage.setItem(KEY, '1')
  emit()
}

export function useOnboarded(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => seen,
  )
}
