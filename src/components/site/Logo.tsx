import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/BrandMark'

/** Logo: drawn mark on an accent tile + wordmark, both from the brand config. */
export function Logo({ className, compact, inverted }: { className?: string; compact?: boolean; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark inverted={inverted} className="size-8" />
      {!compact && <span className="font-display text-[15px] font-bold tracking-[0.08em]">{brand.logoText}</span>}
    </span>
  )
}
