import { BrandMark } from '@/components/BrandMark'
import { Link } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'

/** Light-weight shell for the corporate and partner portals. */
export function PortalShell({ portal, who, tabs, tab, onTab, children, actions }: { portal: string; who: string; tabs: { id: string; label: string }[]; tab: string; onTab: (id: string) => void; children: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${portal} · ${brand.name}`
  }, [portal])
  return (
    <div className="min-h-dvh bg-ink pb-24 font-body text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark className="size-8" />
            <span className="hidden text-[14px] font-bold sm:inline">{brand.shortName}</span>
          </Link>
          <span className="h-5 w-px bg-line" />
          <span className="text-[13.5px] font-semibold">{portal}</span>
          <span className="flex-1" />
          {actions}
          <span className="hidden text-right text-[12.5px] leading-tight sm:block"><span className="block font-semibold">{who}</span><span className="text-mute">Demo account</span></span>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-6" aria-label={`${portal} sections`}>
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => onTab(t.id)} aria-current={tab === t.id ? 'page' : undefined} className={cn('-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-semibold', tab === t.id ? 'border-accent text-paper' : 'border-transparent text-mute hover:text-paper')}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  )
}
