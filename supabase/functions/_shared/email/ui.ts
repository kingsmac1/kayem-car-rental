/**
 * Email building blocks. Plain functions that return HTML strings, written for
 * the lowest common denominator of email clients (Outlook desktop included):
 * table layout, inline styles, bgcolor attributes, no flexbox or grid, no SVG.
 *
 * Every value that came from a person (names, notes, addresses) must pass
 * through `esc()` before it lands in markup.
 */
import { brand } from '../../../../src/config/brand.ts'

export { brand }

const c = brand.colors

/** Colours tuned for a light reading surface (the site's dark ink stays for the header band). */
export const tone = {
  ink: c.ink,
  paper: '#FFFFFF',
  page: c.paper,
  text: '#26251F',
  mute: '#6E6A61',
  line: '#E4E0D6',
  accent: c.accent,
  /** Text on the yellow accent is always pure black, whatever the brand's ink is. */
  onAccent: '#000000',
  ok: '#1F8A4C',
  warn: '#A86A00',
  bad: '#C8372D',
} as const

export const font = {
  display: `'${brand.fonts.display}', 'Arial Black', Arial, sans-serif`,
  body: `'${brand.fonts.body}', 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  plate: `'${brand.fonts.label}', 'Arial Black', Arial, sans-serif`,
} as const

export const LOGO_URL = `${brand.siteUrl}/email/logo.png`

export function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ---- formatting ---------------------------------------------------------------

const TZ = 'Africa/Lagos'

export const money = (n: number) =>
  new Intl.NumberFormat(brand.currency.locale, { style: 'currency', currency: brand.currency.code, maximumFractionDigits: 0 }).format(n)

/** "Fri 24 Oct, 10:00" in Lagos time, whatever the server's clock zone is. */
export const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date(iso))

export const day = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date(iso))

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const whatsappLink = (text?: string) =>
  `https://wa.me/${brand.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`

// ---- blocks -------------------------------------------------------------------

export function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-family:${font.display};font-size:26px;line-height:32px;font-weight:700;color:${tone.ink};letter-spacing:-0.3px;">${text}</h1>`
}

export function subheading(text: string) {
  return `<h2 style="margin:32px 0 12px;font-family:${font.display};font-size:16px;line-height:22px;font-weight:700;color:${tone.ink};">${text}</h2>`
}

export function para(html: string, opts: { mute?: boolean; small?: boolean } = {}) {
  const size = opts.small ? '13px' : '15px'
  const lh = opts.small ? '20px' : '24px'
  return `<p style="margin:0 0 16px;font-family:${font.body};font-size:${size};line-height:${lh};color:${opts.mute ? tone.mute : tone.text};">${html}</p>`
}

/** Solid button that survives Outlook: the padding lives on the cell, not the link. */
export function button(label: string, href: string, kind: 'primary' | 'secondary' = 'primary') {
  const bg = kind === 'primary' ? tone.accent : tone.paper
  const fg = kind === 'primary' ? tone.onAccent : tone.ink
  const border = kind === 'primary' ? tone.accent : tone.ink
  // The inner span repeats the colour because some webmail apps restyle bare links.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>
<td bgcolor="${bg}"${kind === 'primary' ? ' class="accent-bg"' : ''} style="background:${bg};border:2px solid ${border};border-radius:6px;">
<a href="${esc(href)}"${kind === 'primary' ? ' class="on-accent"' : ''} style="display:inline-block;padding:13px 26px;font-family:${font.body};font-size:15px;line-height:20px;font-weight:700;color:${fg};text-decoration:none;"><span${kind === 'primary' ? ' class="on-accent"' : ''} style="color:${fg};">${esc(label)}</span></a>
</td></tr></table>`
}

/**
 * The booking reference set like a number plate — the one loud element in every
 * booking email, because it is the thing customers read out on the phone or at the desk.
 */
export function plate(ref: string, caption = 'Booking reference') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 28px;"><tr><td>
<p style="margin:0 0 8px;font-family:${font.body};font-size:13px;line-height:18px;color:${tone.mute};">${esc(caption)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${tone.accent}" class="accent-bg" style="background:${tone.accent};border:3px solid ${tone.onAccent};border-radius:8px;padding:10px 22px 11px;">
<span class="on-accent" style="font-family:${font.plate};font-size:26px;line-height:30px;letter-spacing:4px;color:${tone.onAccent};white-space:nowrap;">${esc(ref)}</span>
</td></tr></table>
</td></tr></table>`
}

/** Label/value rows. Values are raw HTML so callers can format; escape before passing. */
export function rows(items: Array<[label: string, value: string] | null | false>, opts: { total?: [string, string] } = {}) {
  const list = items.filter(Boolean) as Array<[string, string]>
  const cell = (label: string, value: string, last: boolean) => `<tr>
<td valign="top" style="padding:11px 16px 11px 0;${last ? '' : `border-bottom:1px solid ${tone.line};`}font-family:${font.body};font-size:14px;line-height:20px;color:${tone.mute};width:38%;">${esc(label)}</td>
<td valign="top" style="padding:11px 0;${last ? '' : `border-bottom:1px solid ${tone.line};`}font-family:${font.body};font-size:14px;line-height:20px;color:${tone.text};font-weight:600;">${value}</td>
</tr>`
  const body = list.map(([l, v], i) => cell(l, v, i === list.length - 1 && !opts.total)).join('')
  const total = opts.total
    ? `<tr>
<td style="padding:14px 16px 0 0;border-top:2px solid ${tone.ink};font-family:${font.body};font-size:15px;line-height:22px;font-weight:700;color:${tone.ink};">${esc(opts.total[0])}</td>
<td style="padding:14px 0 0;border-top:2px solid ${tone.ink};font-family:${font.display};font-size:18px;line-height:22px;font-weight:700;color:${tone.ink};">${opts.total[1]}</td>
</tr>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">${body}${total}</table>`
}

/** Side-by-side pickup → return, which stacks to one column on phones. */
export function journey(from: { label: string; when: string; where: string }, to: { label: string; when: string; where: string }) {
  const leg = (x: typeof from) => `<td class="stack" valign="top" width="50%" style="padding:0 12px 16px 0;">
<p style="margin:0 0 4px;font-family:${font.body};font-size:13px;line-height:18px;color:${tone.mute};">${esc(x.label)}</p>
<p style="margin:0 0 2px;font-family:${font.display};font-size:16px;line-height:22px;font-weight:700;color:${tone.ink};">${esc(x.when)}</p>
<p style="margin:0;font-family:${font.body};font-size:14px;line-height:20px;color:${tone.text};">${esc(x.where)}</p>
</td>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;"><tr>${leg(from)}${leg(to)}</tr></table>`
}

/** A tinted panel for one important message (what to bring, deposit status, an alert). */
export function callout(html: string, kind: 'info' | 'ok' | 'warn' | 'bad' = 'info') {
  const edge = { info: tone.ink, ok: tone.ok, warn: tone.warn, bad: tone.bad }[kind]
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
<td bgcolor="${tone.page}" style="background:${tone.page};border-left:4px solid ${edge};border-radius:4px;padding:16px 18px;font-family:${font.body};font-size:14px;line-height:21px;color:${tone.text};">${html}</td>
</tr></table>`
}

export function list(items: string[]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">${items
    .map(
      (it) => `<tr><td valign="top" style="padding:0 10px 8px 0;font-family:${font.body};font-size:15px;line-height:22px;color:${tone.ink};font-weight:700;">&#8226;</td>
<td style="padding:0 0 8px;font-family:${font.body};font-size:15px;line-height:22px;color:${tone.text};">${it}</td></tr>`,
    )
    .join('')}</table>`
}

/** Full-width photo with a fixed height so a slow image never collapses the layout. */
export function photo(src: string, alt: string) {
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:6px;margin:0 0 20px;background:${tone.page};" />`
}

export function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0 24px;"><div style="height:1px;line-height:1px;font-size:0;background:${tone.line};">&nbsp;</div></td></tr></table>`
}

// ---- page shell ---------------------------------------------------------------

export interface LayoutOptions {
  title: string
  /** Inbox preview line shown after the subject. Keep it under ~90 characters. */
  preheader: string
  body: string
  /** Staff emails drop the marketing footer and say who they are for. */
  audience?: 'customer' | 'staff'
}

export function layout({ title, preheader, body, audience = 'customer' }: LayoutOptions) {
  const footer =
    audience === 'staff'
      ? `Sent to ${esc(brand.shortName)} staff by the rental system. Change alerts in Admin &rsaquo; Settings.`
      : `Questions? Reply to this email, call <a href="tel:${brand.contact.phoneTel}" style="color:${tone.mute};">${esc(brand.contact.phoneDisplay)}</a> or <a href="${whatsappLink()}" style="color:${tone.mute};">message us on WhatsApp</a>, 24/7.<br/>${esc(brand.name)} &middot; ${esc(brand.contact.address)}`

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="${brand.fonts.googleHref}" rel="stylesheet" />
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${tone.ink}; }
  /* Outlook.com and Outlook apps in dark mode recolour text; keep black on yellow. */
  [data-ogsc] .on-accent { color:${tone.onAccent} !important; }
  [data-ogsb] .accent-bg { background-color:${tone.accent} !important; }
  @media (max-width: 620px) {
    .shell { width:100% !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .stack { display:block !important; width:100% !important; padding-right:0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${tone.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${tone.page};">${esc(preheader)}${'&#8202;&zwnj;'.repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${tone.page}" style="background:${tone.page};">
<tr><td align="center" style="padding:28px 12px 40px;">

<table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td bgcolor="${tone.ink}" class="pad" style="background:${tone.ink};border-radius:10px 10px 0 0;padding:22px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="padding-right:12px;"><img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border:0;border-radius:6px;" /></td>
    <td valign="middle" style="font-family:${font.display};font-size:18px;line-height:20px;font-weight:800;letter-spacing:2px;color:${c.paper};">${esc(brand.logoText)}</td>
  </tr></table>
</td></tr>
<tr><td bgcolor="${tone.accent}" style="background:${tone.accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td bgcolor="${tone.paper}" class="pad" style="background:${tone.paper};border-radius:0 0 10px 10px;padding:36px 32px 12px;">
${body}
</td></tr>
<tr><td class="pad" style="padding:24px 32px 0;font-family:${font.body};font-size:12px;line-height:19px;color:${tone.mute};">${footer}</td></tr>
</table>

</td></tr>
</table>
</body>
</html>`
}
