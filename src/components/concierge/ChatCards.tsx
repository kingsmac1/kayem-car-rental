import { brand } from '@/config/brand'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, CreditCard, Headphones, MapPin } from 'lucide-react'
import { sm } from '@/data/images'
import { useDb } from '@/lib/db'
import { fmtDay, fmtTime, naira } from '@/lib/utils'
import { carName } from '@/mocks/cars'
import { locationName } from '@/mocks/locations'
import type { ChatCard } from '@/mocks/types'

export function ChatCardView({ card, onPick, onPay }: { card: ChatCard; onPick: (text: string) => void; onPay: (ref: string, amount: number) => void }) {
  const cars = useDb((s) => s.cars)

  if (card.kind === 'cars') {
    return (
      <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" data-lenis-prevent>
        {card.carIds.map((id, i) => {
          const c = cars.find((x) => x.id === id)
          if (!c) return null
          return (
            <div key={id} className="w-44 shrink-0 snap-start overflow-hidden rounded-lg bg-[#111b21]">
              <img src={sm(c.image)} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="p-2.5">
                <p className="truncate text-[13px] font-semibold text-[#e9edef]">{carName(c)}</p>
                <p className="text-[12px] text-[#8696a0]">{naira(c.rates.daily)}/day · {c.seats} seats</p>
                <button type="button" onClick={() => onPick(`Book the ${['first', 'second', 'third'][i]} one`)} className="mt-2 w-full rounded-md bg-[#00a884] py-1.5 text-[12.5px] font-semibold text-[#111b21] hover:brightness-110">
                  Choose
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (card.kind === 'quote') {
    const c = cars.find((x) => x.id === card.carId)
    if (!c) return null
    return (
      <div className="mt-2 overflow-hidden rounded-lg bg-[#111b21]">
        <div className="flex gap-3 p-2.5">
          <img src={sm(c.image)} alt="" className="aspect-square w-14 rounded object-cover" />
          <div className="min-w-0 text-[12.5px]">
            <p className="truncate font-semibold text-[#e9edef]">{carName(c)}</p>
            <p className="text-[#8696a0]">{card.days} day{card.days > 1 ? 's' : ''} · {c.city}</p>
          </div>
        </div>
        <div className="border-t border-white/5 px-3 py-2 text-[12.5px]">
          <p className="flex justify-between gap-3 text-[#e9edef]"><span>Rental</span><span className="font-mono">{naira(card.total)}</span></p>
          <p className="flex justify-between gap-3 text-[#8696a0]"><span>Refundable deposit</span><span className="font-mono">{naira(card.deposit)}</span></p>
          <p className="mt-1 flex justify-between border-t border-white/5 pt-1 font-semibold text-[#e9edef]"><span>Due now</span><span className="font-mono">{naira(card.total + card.deposit)}</span></p>
        </div>
      </div>
    )
  }

  if (card.kind === 'payment') {
    return (
      <div className="mt-2 overflow-hidden rounded-lg bg-[#111b21]">
        <div className="flex items-center gap-3 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded bg-[#0b9a5b]"><CreditCard className="size-5 text-white" /></span>
          <div className="min-w-0 text-[12.5px]">
            <p className="font-semibold text-[#e9edef]">Secure payment · {card.ref}</p>
            <p className="truncate text-[#53bdeb]">pay.{brand.slug}.demo/{card.ref}</p>
          </div>
        </div>
        <button type="button" onClick={() => onPay(card.ref, card.amount)} className="w-full border-t border-white/5 py-2.5 text-[13px] font-semibold text-[#53bdeb] hover:bg-white/5">
          Pay {naira(card.amount)}
        </button>
      </div>
    )
  }

  if (card.kind === 'confirmed') {
    const c = cars.find((x) => x.id === card.carId)
    return (
      <div className="mt-2 rounded-lg border border-[#00a884]/40 bg-[#00a884]/10 p-3 text-[12.5px] text-[#e9edef]">
        <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="size-4 text-[#00a884]" /> Booking {card.ref}</p>
        {c ? <p className="mt-1">{carName(c)}</p> : null}
        <p className="mt-1 text-[#8696a0]">{fmtDay(card.start)}, {fmtTime(card.start)}</p>
        <p className="flex items-start gap-1 text-[#8696a0]"><MapPin className="mt-0.5 size-3 shrink-0" />{locationName(card.pickup)}</p>
        <Link to="/account" className="mt-2 inline-block text-[#53bdeb] hover:underline">View in My trips</Link>
      </div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#111b21] p-2.5 text-[12.5px] text-[#8696a0]">
      <Headphones className="size-4 text-[#00a884]" /> Transferring to the team…
    </div>
  )
}
