import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'roll-host relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none transition-[background-color,color,border-color,opacity] duration-200 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-paper',
        ghost: 'border border-line-strong text-paper hover:border-paper bg-transparent',
        dark: 'bg-ink text-paper hover:bg-ink-3',
        subtle: 'bg-ink-3 text-paper hover:bg-ink-2 border border-line',
        danger: 'bg-bad text-ink hover:bg-paper',
        link: 'text-paper underline-offset-4 hover:text-accent px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 label !text-[9.5px]',
        md: 'h-11 px-5 label',
        lg: 'h-14 px-7 label !text-[11.5px]',
        icon: 'h-10 w-10',
        // Admin uses a calmer body-font button.
        app: 'h-9 px-3.5 text-[13px] font-semibold rounded-[2px]',
        appSm: 'h-7 px-2.5 text-xs font-semibold rounded-[2px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  /** Text-roll label animation (public site). Pass a string child. */
  roll?: boolean
  icon?: ReactNode
  cursor?: 'book' | 'view' | 'drag'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, roll, icon, children, cursor, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    const label = roll && typeof children === 'string' ? <RollText>{children}</RollText> : children
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        data-cursor={cursor}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {label}
            {icon && !loading ? icon : null}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

/** Label slides up while an identical copy slides in from below (on .roll-host hover). */
export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('roll', className)}>
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  )
}

export { buttonVariants }
