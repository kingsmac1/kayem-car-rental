import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent({ title, description, children, className, side }: { title: string; description?: string; children: ReactNode; className?: string; side?: 'right' }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_.2s_ease-out]" />
      <D.Content
        className={cn(
          'fixed z-[81] bg-ink-2 border border-line text-paper shadow-[0_24px_60px_-12px_rgba(0,0,0,.7)] focus:outline-none',
          side === 'right'
            ? 'right-0 top-0 h-dvh w-full max-w-xl overflow-y-auto data-[state=open]:animate-[slideIn_.3s_var(--ease-out-expo)]'
            : 'left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[88dvh] overflow-y-auto data-[state=open]:animate-[popIn_.25s_var(--ease-out-expo)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-mute">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="grid size-8 shrink-0 place-items-center text-mute hover:text-paper" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="p-5">{children}</div>
      </D.Content>
    </D.Portal>
  )
}
