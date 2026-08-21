import type { AppState } from './types'
import { buildSeedState } from '@/data/seed'

// Bump when the shape of AppState or the seed changes — a stale payload from an
// older key is discarded rather than migrated (this is a demo, not a product DB).
const STORAGE_KEY = 'fleetpulse.state.v5'

type Listener = () => void

/**
 * A tiny observable store persisted to localStorage. All mutations flow through
 * `update`, which recomputes state immutably, saves, and notifies subscribers.
 * Kept dependency-free on purpose — this is a self-contained client demo.
 */
class Store {
  private state: AppState
  private listeners = new Set<Listener>()

  constructor() {
    this.state = this.load()
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as AppState
    } catch {
      // Corrupt or unavailable storage — fall through to a fresh seed.
    }
    const seed = buildSeedState()
    this.persist(seed)
    return seed
  }

  private persist(state: AppState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore quota/availability errors — the demo keeps working in-memory.
    }
  }

  getState(): AppState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Apply an immutable update. `mutator` returns the next state. */
  update(mutator: (prev: AppState) => AppState) {
    this.state = mutator(this.state)
    this.persist(this.state)
    this.listeners.forEach((l) => l())
  }

  reset() {
    const seed = buildSeedState()
    this.state = seed
    this.persist(seed)
    this.listeners.forEach((l) => l())
  }
}

export const store = new Store()
