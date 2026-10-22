import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'

/** Wordmark: accent monogram tile + logo text, both from the brand config. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label={brand.name}>
      <span className="grid size-8 place-items-center bg-accent font-display text-[17px] font-extrabold leading-none text-accent-ink" aria-hidden>
        {brand.monogram}
      </span>
      {!compact && <span className="font-display text-[15px] font-bold tracking-[0.08em]" aria-hidden>{brand.logoText}</span>}
    </span>
  )
}
