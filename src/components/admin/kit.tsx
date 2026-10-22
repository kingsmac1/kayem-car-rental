import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import type { Booking } from '@/mocks/types'
import { cn } from '@/lib/utils'
import { Pill } from '@/components/ui/misc'

/** Page title row used by every admin screen. */
export function AdminTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight md:text-[26px]">{title}</h1>
        {sub ? <p className="mt-1 text-[14px] text-mute">{sub}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

const BOOKING_TONE: Record<Booking['status'], 'ok' | 'warn' | 'bad' | 'accent' | 'mute' | 'info'> = {
  pending: 'warn', confirmed: 'accent', active: 'ok', returned: 'info', closed: 'mute', cancelled: 'bad',
}
export function BookingStatus({ status, overdue }: { status: Booking['status']; overdue?: boolean }) {
  if (overdue) return <Pill tone="bad" dot>Overdue</Pill>
  return <Pill tone={BOOKING_TONE[status]} dot={status === 'active'} className="capitalize">{status}</Pill>
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-mute" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 w-full rounded-[2px] border border-line bg-ink-3 pl-8 pr-3 text-sm text-paper placeholder:text-mute focus:border-accent focus:outline-none sm:w-64" />
    </label>
  )
}

export function Th({ children, sort, dir, onSort, className }: { children?: ReactNode; sort?: boolean; dir?: 'asc' | 'desc'; onSort?: () => void; className?: string }) {
  return (
    <th scope="col" className={cn('whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-xs font-semibold text-mute', className)} aria-sort={sort ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      {onSort ? (
        <button type="button" onClick={onSort} className="inline-flex items-center gap-1 hover:text-paper">
          {children}
          {sort ? dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
        </button>
      ) : (
        children
      )}
    </th>
  )
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('border-b border-line px-3 py-2.5 align-middle text-[13.5px]', className)}>{children}</td>
}
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-auto border border-line bg-ink-2">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[2px] border border-line bg-ink-3 p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn('rounded-[2px] px-2.5 py-1 text-[12.5px] font-semibold', value === o.id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
