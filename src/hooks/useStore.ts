import { useSyncExternalStore } from 'react'
import { store } from '@/lib/store'
import type { AppState } from '@/lib/types'

/** Subscribe a component to the whole app state. */
export function useStore(): AppState {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState(),
  )
}

/** Subscribe with a selector; re-renders only when the selected slice changes by reference. */
export function useSelector<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => selector(store.getState()),
  )
}
