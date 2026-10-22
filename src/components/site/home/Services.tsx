import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { services } from '@/data/content'
import { sm } from '@/data/images'
import { naira } from '@/lib/utils'
import { SplitHeading } from '../Reveal'

/** Services as a gallery grid: photo tiles that reveal detail on hover/focus (always shown on touch). */
export function Services() {
  return (
    <section id="services" className="border-t border-line py-24 md:py-32" aria-labelledby="services-title">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-2 md:items-end">
          <SplitHeading className="display text-[clamp(36px,6vw,88px)] font-extrabold uppercase tracking-[-0.04em]">
            <span id="services-title">Every kind of trip</span>
          </SplitHeading>
          <p className="max-w-md text-paper/75 md:justify-self-end">From a two-hour airport run to a month-long corporate lease. Same verified process, same tracked cars, same 24/7 support.</p>
        </div>
        <ul className="mt-14 grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-6">
          {services.map((s, i) => (
            <li key={s.id} className={['lg:col-span-4', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'sm:col-span-2 lg:col-span-6'][i]}>
              <Link
                to={s.link.to}
                search={s.link.search}
                data-cursor="view"
                className="group relative block h-[340px] overflow-hidden bg-ink lg:h-[380px]"
              >
                <img src={sm(s.image)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55 grayscale transition-[transform,opacity,filter] duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-105 group-hover:opacity-80 group-hover:grayscale-0 group-focus-visible:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="relative flex h-full flex-col justify-between p-5 md:p-6">
                  <div className="flex items-start justify-between">
                    <span className="num text-[13px] text-paper/60">{String(i + 1).padStart(2, '0')}</span>
                    <span className="grid size-10 place-items-center bg-accent text-accent-ink transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:rotate-45">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="display text-[clamp(24px,2.4vw,34px)] font-extrabold uppercase tracking-[-0.03em]">{s.title}</h3>
                    {/* Hover reveal: detail slides up (always visible on touch screens). */}
                    <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-500 [transition-timing-function:var(--ease-out-expo)] [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:group-hover:grid-rows-[1fr] [@media(hover:hover)]:group-focus-visible:grid-rows-[1fr]">
                      <div className="overflow-hidden">
                        <p className="mt-3 max-w-[40ch] text-[15px] text-paper/85">{s.body}</p>
                        <p className="label mt-3 text-accent">{s.from ? `From ${naira(s.from)}` : 'Monthly invoicing'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
