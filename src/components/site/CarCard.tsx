import { Link } from '@tanstack/react-router'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'
import { sm } from '@/data/images'
import { carName } from '@/mocks/cars'
import type { Car } from '@/mocks/types'
import { cn, naira } from '@/lib/utils'
import { useIsTouch, useReducedMotion } from '@/hooks/useMedia'

/** Car card with a gentle 3D hover tilt (Motion owns hover) and the "view" cursor. */
export function CarCard({ car, available = true, className, search, eager, draggable = true }: { car: Car; available?: boolean; className?: string; search?: Record<string, string | undefined>; eager?: boolean; draggable?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const touch = useIsTouch()
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 160, damping: 18 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 160, damping: 18 })
  const tilt = !touch && !reduced

  return (
    <motion.div style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined} className={cn('group relative', className)}>
      <Link
        ref={ref}
        to="/fleet/$carId"
        params={{ carId: car.id }}
        search={search}
        data-cursor="view"
        draggable={draggable}
        onPointerMove={(e) => {
          if (!tilt || !ref.current) return
          const r = ref.current.getBoundingClientRect()
          mx.set((e.clientX - r.left) / r.width - 0.5)
          my.set((e.clientY - r.top) / r.height - 0.5)
        }}
        onPointerLeave={() => {
          mx.set(0)
          my.set(0)
        }}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-3">
          <img
            src={sm(car.image)}
            alt={`${carName(car)} (${car.year}), ${car.colour}`}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover transition-[transform,filter] duration-700 [transition-timing-function:var(--ease-out-expo)] grayscale-[.35] group-hover:scale-[1.04] group-hover:grayscale-0"
          />
          <div className="absolute inset-x-0 top-0 flex justify-between p-3">
            <span className="label bg-ink/80 px-2 py-1 text-paper backdrop-blur-sm">{car.city}</span>
            {!available ? <span className="label bg-bad px-2 py-1 text-ink">Booked</span> : car.modes.length === 1 ? <span className="label bg-paper px-2 py-1 text-ink">Chauffeur only</span> : null}
          </div>
        </div>
        <div className="flex items-end justify-between gap-4 border-x border-b border-line px-4 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-bold leading-tight tracking-[-0.01em]">
              {car.make} <span className="text-paper/70">{car.model}</span>
            </h3>
            <p className="label mt-2 text-mute">
              {car.category} / {car.seats} seats / {car.transmission === 'Automatic' ? 'Auto' : 'Manual'}
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="num block text-[17px] font-medium text-accent">{naira(car.rates.daily)}</span>
            <span className="label text-mute">per day</span>
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
