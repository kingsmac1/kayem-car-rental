import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { NotFound } from '@/components/NotFound'
import CookieConsent from '@/components/CookieConsent'

// The demo switcher is tiny and shared by every portal.
const DemoSwitcher = lazy(() => import('@/components/demo/DemoSwitcher'))

function LateDemoSwitcher() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1800)
    return () => clearTimeout(t)
  }, [])
  return show ? (
    <Suspense fallback={null}>
      <DemoSwitcher />
    </Suspense>
  ) : null
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <CookieConsent />
      <LateDemoSwitcher />
      <Toaster
        position="bottom-center"
        theme="dark"
        toastOptions={{
          className: '!bg-ink-2 !border !border-line-strong !text-paper !rounded-[2px] !font-body',
        }}
      />
    </>
  ),
  notFoundComponent: NotFound,
})

const page = (loader: () => Promise<{ default: React.ComponentType }>) => lazyRouteComponent(loader)

// ---------------------------------------------------------------- public site
const site = createRoute({ getParentRoute: () => rootRoute, id: 'site', component: page(() => import('@/components/site/SiteLayout')) })
const s = <P extends string>(path: P, loader: () => Promise<{ default: React.ComponentType }>) => createRoute({ getParentRoute: () => site, path, component: page(loader) })

export interface BookSearch {
  car?: string
  city?: string
  start?: string
  end?: string
  mode?: 'self-drive' | 'chauffeur'
}
export interface FleetSearch {
  city?: string
  type?: string
  start?: string
  end?: string
  mode?: string
}

const home = s('/', () => import('@/pages/site/Home'))
const fleet = createRoute({
  getParentRoute: () => site,
  path: '/fleet',
  validateSearch: (q: Record<string, unknown>): FleetSearch => ({
    city: typeof q.city === 'string' ? q.city : undefined,
    type: typeof q.type === 'string' ? q.type : undefined,
    start: typeof q.start === 'string' ? q.start : undefined,
    end: typeof q.end === 'string' ? q.end : undefined,
    mode: typeof q.mode === 'string' ? q.mode : undefined,
  }),
  component: page(() => import('@/pages/site/Fleet')),
})
const carDetail = createRoute({
  getParentRoute: () => site,
  path: '/fleet/$carId',
  validateSearch: (q: Record<string, unknown>): { start?: string; end?: string } => ({
    start: typeof q.start === 'string' ? q.start : undefined,
    end: typeof q.end === 'string' ? q.end : undefined,
  }),
  component: page(() => import('@/pages/site/CarDetail')),
})
const book = createRoute({
  getParentRoute: () => site,
  path: '/book',
  validateSearch: (q: Record<string, unknown>): BookSearch => ({
    car: typeof q.car === 'string' ? q.car : undefined,
    city: typeof q.city === 'string' ? q.city : undefined,
    start: typeof q.start === 'string' ? q.start : undefined,
    end: typeof q.end === 'string' ? q.end : undefined,
    mode: q.mode === 'chauffeur' || q.mode === 'self-drive' ? q.mode : undefined,
  }),
  component: page(() => import('@/pages/site/Book')),
})
const account = s('/account', () => import('@/pages/site/Account'))
const login = s('/login', () => import('@/pages/site/Login'))
const business = s('/business', () => import('@/pages/site/Business'))
const earn = s('/earn', () => import('@/pages/site/Earn'))
const about = s('/about', () => import('@/pages/site/About'))
const contact = s('/contact', () => import('@/pages/site/Contact'))
const faq = s('/faq', () => import('@/pages/site/Faq'))
const terms = s('/terms', () => import('@/pages/site/Terms'))
const privacy = s('/privacy', () => import('@/pages/site/Privacy'))

// ---------------------------------------------------------------- admin
const adminLogin = createRoute({ getParentRoute: () => rootRoute, path: '/admin/login', component: page(() => import('@/pages/admin/AdminLogin')) })
const admin = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: page(() => import('@/components/admin/AdminLayout')) })
const a = <P extends string>(path: P, loader: () => Promise<{ default: React.ComponentType }>) => createRoute({ getParentRoute: () => admin, path, component: page(loader) })
const adminRoutes = [
  a('/', () => import('@/pages/admin/Overview')),
  createRoute({
    getParentRoute: () => admin,
    path: '/bookings',
    validateSearch: (q: Record<string, unknown>): { new?: string; id?: string } => ({
      new: typeof q.new === 'string' ? q.new : undefined,
      id: typeof q.id === 'string' ? q.id : undefined,
    }),
    component: page(() => import('@/pages/admin/Bookings')),
  }),
  a('/fleet', () => import('@/pages/admin/Fleet')),
  a('/command', () => import('@/pages/admin/Command')),
  a('/inspections', () => import('@/pages/admin/Inspections')),
  a('/maintenance', () => import('@/pages/admin/Maintenance')),
  a('/customers', () => import('@/pages/admin/Customers')),
  a('/chauffeurs', () => import('@/pages/admin/Chauffeurs')),
  a('/pricing', () => import('@/pages/admin/Pricing')),
  a('/finance', () => import('@/pages/admin/Finance')),
  a('/analyst', () => import('@/pages/admin/Analyst')),
  a('/inbox', () => import('@/pages/admin/Inbox')),
  a('/corporate', () => import('@/pages/admin/Corporate')),
  a('/partners', () => import('@/pages/admin/Partners')),
  a('/marketing', () => import('@/pages/admin/Marketing')),
  a('/settings', () => import('@/pages/admin/Settings')),
]

// ---------------------------------------------------------------- portals
const driver = createRoute({ getParentRoute: () => rootRoute, path: '/driver', component: page(() => import('@/pages/driver/DriverApp')) })
const corporate = createRoute({ getParentRoute: () => rootRoute, path: '/corporate', component: page(() => import('@/pages/corporate/CorporatePortal')) })
const partner = createRoute({ getParentRoute: () => rootRoute, path: '/partner', component: page(() => import('@/pages/partner/PartnerPortal')) })

const routeTree = rootRoute.addChildren([
  site.addChildren([home, fleet, carDetail, book, account, login, business, earn, about, contact, faq, terms, privacy]),
  adminLogin,
  admin.addChildren(adminRoutes),
  driver,
  corporate,
  partner,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultPendingMs: 400,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
