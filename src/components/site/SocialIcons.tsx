import { brand } from '@/config/brand'
import { cn } from '@/lib/utils'

const paths: Record<keyof typeof brand.social, string> = {
  instagram: 'M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.9 8.2c-.1-1.6-.4-3-1.6-4.1-1.1-1.2-2.5-1.5-4.1-1.6-1.6-.1-6.5-.1-8.2 0-1.6.1-3 .4-4.1 1.6C2.8 5.2 2.5 6.6 2.4 8.2c-.1 1.6-.1 6.5 0 8.2.1 1.6.4 3 1.6 4.1 1.1 1.2 2.5 1.5 4.1 1.6 1.6.1 6.5.1 8.2 0 1.6-.1 3-.4 4.1-1.6 1.2-1.1 1.5-2.5 1.6-4.1.1-1.7.1-6.6-.1-8.2ZM19.8 18.2c-.3.9-1 1.5-1.9 1.9-1.3.5-4.4.4-5.9.4s-4.6.1-5.9-.4a3.3 3.3 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.9s-.1-4.6.4-5.9c.3-.9 1-1.5 1.9-1.9 1.3-.5 4.4-.4 5.9-.4s4.6-.1 5.9.4c.9.3 1.5 1 1.9 1.9.5 1.3.4 4.4.4 5.9s.1 4.6-.4 5.9Z',
  x: 'M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.2L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.3 5.7L17.8 3Zm-1 16.2h1.7L7.3 4.7H5.5l11.3 14.5Z',
  facebook: 'M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.5v3.4h2.8V21H14v-9.1h2.8l.4-3.4H14Z',
  linkedin: 'M6.9 21H3.2V9h3.7v12ZM5 7.4a2.2 2.2 0 1 1 0-4.3 2.2 2.2 0 0 1 0 4.3ZM21 21h-3.7v-5.8c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V21H9.4V9H13v1.6c.5-.9 1.7-2 3.5-2 3.7 0 4.4 2.5 4.4 5.7V21Z',
  tiktok: 'M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.1-2.8V9.2a6.2 6.2 0 1 0 5.4 6.2V8.7a8 8 0 0 0 4.4 1.4V6.8a4.5 4.5 0 0 1-4.4-4.8Z',
}
const labels: Record<keyof typeof brand.social, string> = { instagram: 'Instagram', x: 'X (Twitter)', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok' }

export function SocialIcons({ className, iconClass }: { className?: string; iconClass?: string }) {
  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {(Object.keys(brand.social) as (keyof typeof brand.social)[]).map((k) => (
        <li key={k}>
          <a href={brand.social[k]} target="_blank" rel="noreferrer" aria-label={labels[k]} className="grid size-10 place-items-center transition-colors hover:text-accent">
            <svg viewBox="0 0 24 24" className={cn('size-[18px] fill-current', iconClass)} aria-hidden>
              <path d={paths[k]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('fill-current', className)} aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.2 8.2 0 0 1-4.1-3.6c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2 13.8 13.8 0 0 0 5.3 4.7c2 .8 2.7.9 3.7.8a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.2-.3-.3-.6-.4ZM12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  )
}
