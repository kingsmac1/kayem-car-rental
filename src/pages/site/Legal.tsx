import { brand } from '@/config/brand'
import { fmtDateY } from '@/lib/utils'
import { PageHeader } from '@/components/site/PageHeader'

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: [string, string][] }) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <article className="container-x max-w-3xl py-16">
        <p className="label text-mute">Last updated {fmtDateY(new Date(new Date().getFullYear(), 0, 15))} · {brand.name}</p>
        <ol className="mt-8 flex flex-col gap-10">
          {sections.map(([h, b], i) => (
            <li key={h}>
              <h2 className="display text-[22px] font-bold uppercase tracking-[-0.02em]">{i + 1}. {h}</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-paper/80">{b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 border-t border-line pt-6 text-[14px] text-mute">Demo text — have a Nigerian lawyer review terms for each client before going live.</p>
      </article>
    </>
  )
}
