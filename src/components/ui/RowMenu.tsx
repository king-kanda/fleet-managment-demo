import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'

export interface MenuAction {
  label: string
  icon?: string
  onSelect?: () => void
  destructive?: boolean
  // Render a custom node (e.g. a ConfirmDialog trigger) instead of a plain item.
  render?: (children: ReactNode) => ReactNode
}

export function RowMenu({ actions }: { actions: MenuAction[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-btn" aria-label="Actions">
          <Icon name="more" size={18} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align="end" sideOffset={4}>
          {actions.map((a, i) => {
            const item = (
              <DropdownMenu.Item
                key={i}
                className={`menu-item ${a.destructive ? 'destructive' : ''}`}
                onSelect={(e) => {
                  if (a.render) e.preventDefault()
                  a.onSelect?.()
                }}
              >
                {a.icon && <Icon name={a.icon} size={15} />}
                {a.label}
              </DropdownMenu.Item>
            )
            return a.render ? <div key={i}>{a.render(item)}</div> : item
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
