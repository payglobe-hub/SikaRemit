import * as React from 'react'
import { Loader2 } from 'lucide-react'

type SwitchProps = React.HTMLAttributes<HTMLButtonElement> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  loading?: boolean
}

export function Switch({ 
  className,
  checked,
  onCheckedChange,
  disabled,
  loading,
  ...props 
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-11 w-16 items-center rounded-full transition-colors 
        ${checked ? 'bg-primary' : 'bg-gray-200'} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
        ${className}`}
      onClick={() => !disabled && onCheckedChange(!checked)}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className={`block h-6 w-6 rounded-full bg-white shadow-lg 
          transform transition-transform ${checked ? 'translate-x-10' : 'translate-x-1'}`} />
      )}
    </button>
  )
}
