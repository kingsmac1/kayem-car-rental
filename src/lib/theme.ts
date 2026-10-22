import { brand } from '@/config/brand'

/** Pushes brand colours and fonts from the config into CSS variables. */
export function applyBrandTheme() {
  const root = document.documentElement.style
  const c = brand.colors
  const map: Record<string, string> = {
    '--brand-ink': c.ink,
    '--brand-ink-2': c.ink2,
    '--brand-ink-3': c.ink3,
    '--brand-paper': c.paper,
    '--brand-mute': c.mute,
    '--brand-accent': c.accent,
    '--brand-accent-ink': c.accentInk,
    '--brand-ok': c.ok,
    '--brand-warn': c.warn,
    '--brand-bad': c.bad,
    '--font-display-family': `'${brand.fonts.display}'`,
    '--font-label-family': `'${brand.fonts.label}'`,
    '--font-body-family': `'${brand.fonts.body}'`,
    '--font-mono-family': `'${brand.fonts.mono}'`,
  }
  for (const [k, v] of Object.entries(map)) root.setProperty(k, v)
}
