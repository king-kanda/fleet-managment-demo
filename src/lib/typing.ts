/**
 * Which driver conversations are waiting on a generated reply, so the thread can
 * show a "typing…" bubble. Kept out of the persisted app state — it is transient
 * UI truth, not demo data.
 */
type Listener = () => void

const pending = new Set<string>()
const listeners = new Set<Listener>()
let snapshot: string[] = []

function emit() {
  snapshot = [...pending]
  listeners.forEach((l) => l())
}

export const typingStore = {
  subscribe(l: Listener) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  /** Stable array identity between changes, as useSyncExternalStore requires. */
  get(): string[] {
    return snapshot
  },
  start(driverId: string) {
    if (pending.has(driverId)) return
    pending.add(driverId)
    emit()
  },
  stop(driverId: string) {
    if (!pending.delete(driverId)) return
    emit()
  },
}
