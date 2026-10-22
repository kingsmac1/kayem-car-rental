import { Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { ScrollTrigger } from '@/lib/gsap'
import { scrollToTop, startSmoothScroll, stopSmoothScroll } from '@/lib/smooth'
import { Header } from './Header'
import { Footer } from './Footer'
import { Cursor } from './Cursor'
import { Loader } from './Loader'
import { PageCurtain } from './PageCurtain'

const Concierge = lazy(() => import('@/components/concierge/ConciergeWidget'))

export default function SiteLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    startSmoothScroll()
    document.body.classList.add('grain')
    return () => {
      stopSmoothScroll()
      document.body.classList.remove('grain')
    }
  }, [])

  useEffect(() => {
    scrollToTop(true)
    // New page content changes layout: let triggers re-measure after paint.
    const t = setTimeout(() => ScrollTrigger.refresh(), 120)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <div className="relative min-h-dvh bg-ink text-paper">
      <a href="#main" className="label sr-only z-[200] bg-accent px-4 py-3 text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Loader />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <Cursor />
      <PageCurtain />
      <Suspense fallback={null}>
        <Concierge />
      </Suspense>
    </div>
  )
}
