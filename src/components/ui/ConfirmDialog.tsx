import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'

interface Props {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = 'Confirm', destructive, onConfirm }: Props) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content" style={{ maxWidth: 400 }}>
          <AlertDialog.Title className="dialog-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dialog-desc" style={{ marginTop: 8 }}>{description}</AlertDialog.Description>
          <div className="dialog-footer" style={{ marginTop: 22 }}>
            <AlertDialog.Cancel asChild>
              <button className="btn ghost">Cancel</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className={`btn ${destructive ? 'danger-solid' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
