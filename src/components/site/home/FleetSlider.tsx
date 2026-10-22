import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronsRight } from 'lucide-react'
import { useDb } from '@/lib/db'
import { scrollToEl } from '@/lib/smooth'
import { isAvailable } from '@/services/fleet'
import { CarCard } from '../CarCard'
import { SplitHeading } from '../Reveal'
import { RollText } from '@/components/ui/button'

/** Draggable horizontal slider for the featured fleet, with a "1/6" counter and a Skip link. */
export function FleetSlider() {
  const cars = useDb((s) => s.cars.filter((c) => c.featured).slice(0, 6))
  const state = useDb((s) => s)
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Mouse drag-to-scroll with momentum (touch uses native scrolling + snap).
  useEffect(() => {
    const el = track.current
    if (!el) return
    let down = false
    let startX = 0
    let startLeft = 0
    let lastX = 0
    let lastT = 0
    let v = 0
    let raf = 0
    let moved = false
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      down = true
      moved = false
      startX = lastX = e.clientX
      startLeft = el.scrollLeft
      lastT = performance.now()
      cancelAnimationFrame(raf)
      el.style.scrollSnapType = 'none'
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4 && !moved) {
        moved = true
        setDragging(true)
      }
      el.scrollLeft = startLeft - dx
      const now = performance.now()
      v = (e.clientX - lastX) / Math.max(1, now - lastT)
      lastX = e.clientX
      lastT = now
    }
    const onUp = () => {
      if (!down) return
      down = false
      setTimeout(() => setDragging(false), 0)
      const glide = () => {
        el.scrollLeft -= v * 16
        v *= 0.92
        if (Math.abs(v) > 0.05) raf = requestAnimationFrame(glide)
        else el.style.scrollSnapType = ''
      }
      raf = requestAnimationFrame(glide)
    }
    // Swallow the click that ends a drag so cards don't open.
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null
      if (!card) return
      const w = card.offsetWidth + 20
      setIndex(Math.min(cars.length - 1, Math.round(el.scrollLeft / w)))
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('click', onClick, true)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [cars.length])

  const go = (dir: 1 | -1) => {
    const el = track.current
    const card = el?.firstElementChild as HTMLElement | null
    if (!el || !card) return
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' })
  }

  return (
    <section className="relative overflow-hidden border-t border-line py-24 md:py-32" aria-labelledby="fleet-title">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <SplitHeading className="display text-[clamp(36px,6vw,88px)] font-extrabold uppercase tracking-[-0.04em]">
              <span id="fleet-title">The fleet</span>
            </SplitHeading>
            <p className="mt-5 max-w-md text-paper/75">Twenty-plus cars across three cities, from fuel-sipping saloons to the chairman’s S-Class. Every one tracked, insured and inspected before your trip.</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="num text-[15px]" aria-live="polite">
              <span className="text-accent">{index + 1}</span>
              <span className="text-mute">/{cars.length}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} className="grid size-11 place-items-center border border-line-strong hover:border-paper disabled:opacity-30" aria-label="Previous car" disabled={index === 0}>
                <ArrowLeft className="size-4" />
              </button>
              <button type="button" onClick={() => go(1)} className="grid size-11 place-items-center border border-line-strong hover:border-paper disabled:opacity-30" aria-label="Next car" disabled={index >= cars.length - 1}>
                <ArrowRight className="size-4" />
              </button>
            </div>
            <button type="button" onClick={() => scrollToEl('#how-it-works')} className="roll-host label inline-flex h-11 items-center gap-1.5 bg-accent px-4 text-accent-ink">
              <RollText>Skip</RollText>
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={track}
        data-cursor="drag"
        className={`mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--gutter)] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        role="region"
        aria-label="Featured cars, scroll horizontally"
        tabIndex={0}
      >
        {cars.map((car, i) => (
          <div key={car.id} className="w-[82vw] shrink-0 snap-start sm:w-[46vw] lg:w-[31vw] xl:w-[27vw]">
            <CarCard car={car} available={isAvailable(state, car) || car.status === 'rented'} eager={i < 2} draggable={false} />
          </div>
        ))}
        <div className="flex w-[60vw] shrink-0 snap-start items-center justify-center border border-dashed border-line sm:w-[30vw] lg:w-[20vw]">
          <Link to="/fleet" className="roll-host label inline-flex items-center gap-2 text-accent">
            <RollText>See all cars</RollText> <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
