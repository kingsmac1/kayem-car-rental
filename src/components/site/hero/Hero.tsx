import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { brand } from '@/config/brand'
import { images } from '@/data/images'
import { gsap } from '@/lib/gsap'
import { isLowPower, isSmallScreen, isTouch, prefersReducedMotion } from '@/lib/env'
import { useDb } from '@/lib/db'
import { isAvailable } from '@/services/fleet'
import { cn } from '@/lib/utils'
import { CountUp, GridLines, SplitHeading } from '../Reveal'
import { BookingBar } from '../BookingBar'
import { createEngineHum } from './engineHum'
import { introDelay } from '../Loader'

const DepthCanvas = lazy(() => import('./DepthCanvas'))

type Mode = 'loading' | 'webgl' | 'css'

export function Hero() {
  const section = useRef<HTMLElement>(null)
  const fallbackImg = useRef<HTMLImageElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const [mode, setMode] = useState<Mode>('loading')
  const [canvasReady, setCanvasReady] = useState(false)
  const [inView, setInView] = useState(true)
  const [film, setFilm] = useState(false)
  const [sound, setSound] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const hum = useRef<ReturnType<typeof createEngineHum> | null>(null)
  const freeToday = useDb((s) => s.cars.filter((c) => isAvailable(s, c)).length)

  // Decide WebGL vs CSS parallax after first paint, lazily.
  useEffect(() => {
    const lowEnd = prefersReducedMotion() || isLowPower() || (isSmallScreen() && isTouch())
    if (lowEnd) {
      setMode('css')
      return
    }
    const go = () => setMode('webgl')
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1500 }) : window.setTimeout(go, 600)
    return () => {
      if (!w.requestIdleCallback) clearTimeout(id)
    }
  }, [])

  // Pointer + device tilt feed the depth shader (or the CSS fallback).
  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = section.current
    if (!el) return
    const img = fallbackImg.current
    const xTo = img ? gsap.quickTo(img, 'x', { duration: 1.2, ease: 'power3' }) : null
    const yTo = img ? gsap.quickTo(img, 'y', { duration: 1.2, ease: 'power3' }) : null
    const set = (x: number, y: number) => {
      pointer.current = { x, y }
      xTo?.(x * -18)
      yTo?.(y * -12)
    }
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    }
    const tilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      set(Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 45) / 25)))
    }
    el.addEventListener('pointermove', move)
    window.addEventListener('deviceorientation', tilt)
    const io = new IntersectionObserver(([en]) => setInView(en.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => {
      el.removeEventListener('pointermove', move)
      window.removeEventListener('deviceorientation', tilt)
      io.disconnect()
    }
  }, [])

  // Film + ambient sound toggles.
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (film) v.play().catch(() => setFilm(false))
    else v.pause()
  }, [film])
  useEffect(() => {
    if (sound) {
      hum.current ??= createEngineHum()
      hum.current.start()
      if (video.current) video.current.muted = false
    } else {
      hum.current?.stop()
      if (video.current) video.current.muted = true
    }
  }, [sound])
  useEffect(() => () => hum.current?.dispose(), [])

  const hasFilm = !!images.hero.video

  return (
    <section ref={section} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink" aria-label="Welcome">
      {/* Layer 1: static photo (first paint, and the CSS parallax fallback). */}
      <img
        ref={fallbackImg}
        src={images.hero.fallback}
        srcSet={`${images.hero.photoSmall} 800w, ${images.hero.fallback} 1600w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        className={cn('absolute inset-[-3%] -z-20 h-[106%] w-[106%] object-cover object-[50%_78%] brightness-[.75] contrast-[1.1] transition-opacity duration-700', canvasReady && 'opacity-0')}
      />
      {/* Layer 2: WebGL depth parallax. */}
      {mode === 'webgl' && (
        <div className={cn('absolute inset-0 -z-10 transition-opacity duration-1000', canvasReady ? 'opacity-100' : 'opacity-0')}>
          <Suspense fallback={null}>
            <DepthCanvas
              image={images.hero.photo}
              depth={images.hero.depth}
              pointer={pointer}
              active={inView && !film}
              onReady={() => setCanvasReady(true)}
              onSlow={() => {
                setCanvasReady(false)
                setMode('css')
              }}
            />
          </Suspense>
        </div>
      )}
      {/* Layer 3: optional film. */}
      {hasFilm && (
        <AnimatePresence>
          {film && (
            <motion.div className="absolute inset-0 -z-[5]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <video
                ref={video}
                className="h-full w-full object-cover brightness-[.55] grayscale-[.6]"
                src={isSmallScreen() ? images.hero.videoSmall : images.hero.video}
                poster={images.hero.videoPoster}
                muted={!sound}
                loop
                playsInline
                preload="none"
                autoPlay
                aria-label="Night drive through the city"
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[4] h-[65%] bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-[4] h-40 bg-gradient-to-b from-ink/80 to-transparent" />
      <GridLines />

      <div className="container-x relative flex flex-1 flex-col pt-28 pb-6 md:pb-8">
        {/* Number board */}
        <div className="flex flex-1 items-start justify-between gap-6 md:items-center">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 md:flex md:flex-col md:gap-6" aria-label="Emkay in numbers">
            {brand.stats.map((s, i) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="label mt-1 text-paper/70">{s.label}</dt>
                <dd className={cn('display text-[34px] font-extrabold leading-none md:text-[44px]', i === 0 && 'text-accent')}>
                  <CountUp value={s.value} suffix={s.suffix} immediate delay={introDelay + i * 0.12} className="font-display" />
                </dd>
              </div>
            ))}
          </dl>
          <div className="hidden flex-col items-end gap-5 text-right md:flex">
            <p className="max-w-[16rem] text-[15px] text-paper/80">Self-drive or chauffeured. Verified customers, tracked cars, honest deposits.</p>
            <div>
              <p className="label text-paper/60">Cities</p>
              <p className="mt-1 text-[15px] font-semibold">{brand.cities.join(' · ')}</p>
            </div>
            <div>
              <p className="label text-paper/60">Free right now</p>
              <p className="num mt-1 text-[15px] font-medium text-accent">{freeToday} cars</p>
            </div>
            {hasFilm && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setFilm((f) => !f)} className="label inline-flex h-9 items-center gap-2 border border-line-strong px-3 hover:border-paper" aria-pressed={film}>
                  {film ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} {film ? 'Stop film' : 'Play film'}
                </button>
                <button type="button" onClick={() => setSound((s) => !s)} className="label inline-flex h-9 items-center gap-2 border border-line-strong px-3 hover:border-paper" aria-pressed={sound}>
                  {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />} {sound ? 'Sound off' : 'Sound on'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Headline + booking bar */}
        <div className="mt-10">
          <SplitHeading as="h1" immediate delay={introDelay} className="display max-w-[14ch] text-[clamp(44px,8.4vw,128px)] font-extrabold uppercase tracking-[-0.045em]">
            {brand.tagline}
          </SplitHeading>
          <div className="mt-6 flex flex-col gap-6 lg:mt-8">
            <p className="max-w-md text-[16px] text-paper/80 md:hidden">Self-drive or chauffeured across {brand.cities.join(', ')}. Book in minutes, on the web or WhatsApp.</p>
            <BookingBar />
          </div>
        </div>
      </div>
    </section>
  )
}
