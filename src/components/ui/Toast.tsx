import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../Icon'

type ToastVariant = 'default' | 'success' | 'error'
interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastApi {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback<ToastApi['toast']>(({ title, description, variant = 'default' }) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), title, description, variant }])
  }, [])

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" duration={3500}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={`toast toast-${t.variant}`}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== t.id))
            }}
          >
            <div className="toast-icon">
              <Icon name={t.variant === 'error' ? 'bell' : 'check'} size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <ToastPrimitive.Title className="toast-title">{t.title}</ToastPrimitive.Title>
              {t.description && <ToastPrimitive.Description className="toast-desc">{t.description}</ToastPrimitive.Description>}
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
