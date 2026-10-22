import { Tabs as T } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Tabs = T.Root
export const TabsContent = T.Content
export function TabsList({ className, ...p }: ComponentProps<typeof T.List>) {
  return <T.List className={cn('flex gap-1 border-b border-line overflow-x-auto', className)} {...p} />
}
export function TabsTrigger({ className, ...p }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-semibold text-mute transition-colors hover:text-paper data-[state=active]:border-accent data-[state=active]:text-paper',
        className,
      )}
      {...p}
    />
  )
}
