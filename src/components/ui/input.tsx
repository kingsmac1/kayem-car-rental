import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const field =
  'w-full bg-ink-3 border border-line text-paper placeholder:text-mute/80 px-3.5 h-12 text-[15px] transition-colors hover:border-line-strong focus:border-accent focus:outline-none aria-[invalid=true]:border-bad disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { compact?: boolean }>(
  ({ className, compact, ...props }, ref) => <input ref={ref} className={cn(field, compact && 'h-9 text-sm px-3 rounded-[2px]', className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, 'h-auto min-h-28 py-3 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }>(
  ({ className, children, compact, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(field, 'appearance-none pr-10 cursor-pointer', compact && 'h-9 text-sm px-3 pr-9 rounded-[2px]', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
    </div>
  ),
)
Select.displayName = 'Select'

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="label text-mute">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-mute">{hint}</p>
      ) : null}
    </div>
  )
}

/** Compact field for admin forms. */
export function AppField({ label, htmlFor, error, children, className }: { label: string; htmlFor?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-mute">
        {label}
      </label>
      {children}
      {error ? <p role="alert" className="text-xs text-bad">{error}</p> : null}
    </div>
  )
}
