import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { brand } from '@/config/brand'
import { addDays, cn, isoDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Quick booking bar: city, pick-up, return, self-drive or chauffeur → filtered fleet. */
export function BookingBar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const today = isoDate(new Date())
  const [city, setCity] = useState<string>(brand.cities[0])
  const [start, setStart] = useState(isoDate(addDays(new Date(), 1)))
  const [end, setEnd] = useState(isoDate(addDays(new Date(), 4)))
  const [mode, setMode] = useState<'self-drive' | 'chauffeur'>('self-drive')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (end <= start) {
      setError('Return date must be after pick-up.')
      return
    }
    setError('')
    navigate({ to: '/fleet', search: { city, start, end, mode } })
  }

  const cell = 'flex flex-col justify-center gap-1 px-4 py-2.5 border-line md:border-r'
  const input = 'bg-transparent text-[15px] font-semibold text-paper outline-none [color-scheme:dark] w-full cursor-pointer'

  return (
    <form onSubmit={submit} className={cn('border border-line-strong bg-ink/80 backdrop-blur-md', className)} aria-label="Quick booking">
      <div className="grid grid-cols-2 md:grid-cols-[1.1fr_1fr_1fr_1.3fr_auto]">
        <label className={cn(cell, 'col-span-2 border-b md:col-span-1 md:border-b-0')}>
          <span className="label text-mute">City</span>
          <select className={cn(input, 'appearance-none')} value={city} onChange={(e) => setCity(e.target.value)}>
            {brand.cities.map((c) => (
              <option key={c} className="bg-ink-2">{c}</option>
            ))}
          </select>
        </label>
        <label className={cn(cell, 'border-r border-b md:border-b-0')}>
          <span className="label text-mute">Pick-up</span>
          <input type="date" className={input} min={today} value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className={cn(cell, 'border-b md:border-b-0')}>
          <span className="label text-mute">Return</span>
          <input type="date" className={input} min={start} value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <fieldset className={cn(cell, 'col-span-2 md:col-span-1')}>
          <legend className="label float-left mb-1 w-full text-mute">Drive</legend>
          <div className="flex gap-1" role="radiogroup">
            {(['self-drive', 'chauffeur'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn('flex-1 border px-2 py-1.5 text-[13px] font-semibold transition-colors', mode === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-paper hover:border-line-strong')}
              >
                {m === 'self-drive' ? 'Self-drive' : 'Chauffeur'}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="lg" roll className="col-span-2 h-14 md:col-span-1 md:h-auto" icon={<ArrowRight className="size-4" />} cursor="book">
          Find a car
        </Button>
      </div>
      {error ? <p role="alert" className="border-t border-line px-4 py-2 text-[13px] text-bad">{error}</p> : null}
    </form>
  )
}
