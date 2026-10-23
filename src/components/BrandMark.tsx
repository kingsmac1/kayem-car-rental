import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'

/**
 * The brand mark from src/config/brand.ts: drawn mark on an accent tile.
 * `inverted` swaps colours (used on the yellow menu and page wipe).
 */
export function BrandMark({ className, round, inverted, bare }: { className?: string; round?: boolean; inverted?: boolean; bare?: boolean }) {
  const fg = inverted ? 'text-accent' : 'text-accent-ink'
  const bg = bare ? '' : inverted ? 'bg-accent-ink' : 'bg-accent'
  return (
    <span className={cn('grid shrink-0 place-items-center', bg, fg, round && 'rounded-full', className)} aria-hidden>
      {brand.logoMarkPath ? (
        <svg viewBox="0 0 32 32" className="h-[70%] w-[70%] fill-current">
          <path d={brand.logoMarkPath} />
        </svg>
      ) : (
        <span className="font-display font-extrabold leading-none">{brand.monogram}</span>
      )}
    </span>
  )
}
