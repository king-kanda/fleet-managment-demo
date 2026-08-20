import * as SwitchPrimitive from '@radix-ui/react-switch'

interface Props {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  id?: string
}

export function Switch({ checked, onCheckedChange, label, id }: Props) {
  const control = (
    <SwitchPrimitive.Root id={id} checked={checked} onCheckedChange={onCheckedChange} className="rx-switch">
      <SwitchPrimitive.Thumb className="rx-switch-thumb" />
    </SwitchPrimitive.Root>
  )
  if (!label) return control
  return (
    <label className="rx-switch-label" htmlFor={id}>
      {control}
      <span>{label}</span>
    </label>
  )
}
