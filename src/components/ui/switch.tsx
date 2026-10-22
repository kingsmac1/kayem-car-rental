import { Switch as S } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Switch({ className, ...p }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line-strong bg-ink-3 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent', className)}
      {...p}
    >
      <S.Thumb className="block size-4 translate-x-1 rounded-full bg-paper transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-ink" />
    </S.Root>
  )
}
