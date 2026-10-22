import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'ok' | 'warn' | 'bad' | 'accent' | 'mute' | 'info'

const toneCls: Record<Tone, string> = {
  ok: 'text-ok bg-ok/10 border-ok/25',
  warn: 'text-warn bg-warn/10 border-warn/25',
  bad: 'text-bad bg-bad/10 border-bad/25',
  accent: 'text-accent bg-accent/10 border-accent/30',
  mute: 'text-mute bg-paper/5 border-line',
  info: 'text-paper bg-paper/8 border-line-strong',
}

export function Pill({ tone = 'mute', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-0.5 text-[11.5px] font-semibold leading-5', toneCls[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-paper/6', className)} aria-hidden />
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 border border-dashed border-line px-6 py-12 text-center', className)}>
      {icon ? <div className="text-mute">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {body ? <p className="max-w-sm text-sm text-mute">{body}</p> : null}
      {action}
    </div>
  )
}

/** Admin panel surface. */
export function Panel({ title, action, children, className, bodyClass }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('min-w-0 border border-line bg-ink-2', className)}>
      {title ? (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-[13.5px] font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={cn('p-4', bodyClass)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="border border-line bg-ink-2 p-4">
      <p className="text-xs font-semibold text-mute">{label}</p>
      <p className={cn('num mt-2 text-[19px] font-medium tracking-tight sm:text-2xl', tone === 'bad' && 'text-bad', tone === 'warn' && 'text-warn', tone === 'accent' && 'text-accent', tone === 'ok' && 'text-ok')}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-mute">{sub}</p> : null}
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const ini = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  // Hue from name so avatars are stable but varied (desaturated to stay on-brand).
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-ink', className)} style={{ background: `hsl(${h} 22% 72%)` }} aria-hidden>
      {ini}
    </span>
  )
}

export function Progress({ value, className, tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'ok' | 'warn' | 'bad' }) {
  return (
    <div className={cn('h-1.5 w-full bg-paper/8', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full transition-[width] duration-500', { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
