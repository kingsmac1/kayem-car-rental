import type { ReactNode } from 'react'
import { GridLines, SplitHeading } from './Reveal'

/** Inner-page header: big display title over the timing-sheet grid. */
export function PageHeader({ title, intro, children, kicker }: { title: string; intro?: ReactNode; children?: ReactNode; kicker?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line pt-36 pb-14 md:pt-44 md:pb-20">
      <GridLines />
      <div className="container-x relative">
        {kicker}
        <SplitHeading as="h1" immediate delay={0.25} className="display max-w-[16ch] text-[clamp(44px,8vw,120px)] font-extrabold uppercase tracking-[-0.045em]">
          {title}
        </SplitHeading>
        {intro ? <div className="mt-6 max-w-xl text-[17px] text-paper/75">{intro}</div> : null}
        {children}
      </div>
    </section>
  )
}
