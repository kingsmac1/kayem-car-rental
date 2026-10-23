/**
 * Email templates. Each takes plain data and returns subject, inbox preview,
 * HTML and a plain-text version (sent alongside the HTML for deliverability).
 *
 * Template names match `OutboundMessage['template']` in src/services/notifications.ts,
 * plus the two sign-in emails used by Supabase Auth.
 */
import {
  brand, button, callout, day, divider, esc, firstName, heading, journey, layout, list, money, para, photo, plate, rows,
  subheading, when, whatsappLink,
} from './ui.ts'

export interface CarInfo {
  name: string
  plate?: string
  /** Absolute URL. JPG/PNG shows everywhere; WebP is skipped by Outlook desktop. */
  image?: string
}

export interface BookingConfirmed {
  name: string
  ref: string
  car: CarInfo
  start: string
  end: string
  pickup: string
  dropoff: string
  mode: 'self-drive' | 'chauffeur'
  chauffeurName?: string
  /** Price lines exactly as quoted at checkout (rental, extras, season, promo). */
  lines: Array<{ label: string; amount: number }>
  total: number
  paid: number
  deposit: number
  manageUrl: string
}

export interface PickupReminder {
  name: string
  ref: string
  car: CarInfo
  start: string
  pickup: string
  mode: 'self-drive' | 'chauffeur'
  chauffeur?: { name: string; phone: string }
  manageUrl: string
}

export interface ReturnReminder {
  name: string
  ref: string
  car: CarInfo
  end: string
  dropoff: string
  extendUrl: string
}

export interface DepositRefunded {
  name: string
  ref: string
  deposit: number
  deductions: Array<{ label: string; amount: number }>
  /** Where the money goes back to, e.g. "Card ending 4081". */
  method: string
  detailsUrl: string
}

export interface ReviewRequest {
  name: string
  ref: string
  car: CarInfo
  reviewUrl: string
}

export interface OwnerDailySummary {
  date: string
  revenue: number
  revenueChange: number
  newBookings: number
  pickups: number
  returns: number
  utilisation: number
  needsAttention: string[]
  dashboardUrl: string
}

export interface Alert {
  title: string
  detail: string
  severity: 'info' | 'warn' | 'bad'
  ref?: string
  car?: string
  at: string
  actionLabel: string
  actionUrl: string
}

export interface AuthLink {
  /** Supabase Auth fills this in; keep the Go template variable as the default. */
  url?: string
}

export interface Rendered {
  subject: string
  html: string
  text: string
}

const sign = `The ${brand.shortName} team`

const textFooter = `Questions? Reply to this email, call ${brand.contact.phoneDisplay} or WhatsApp ${whatsappLink()} (24/7).\n${brand.name}, ${brand.contact.address}`

function carLine(car: CarInfo) {
  return car.plate ? `${esc(car.name)} <span style="font-weight:400;">&middot; ${esc(car.plate)}</span>` : esc(car.name)
}

// ---- customer -----------------------------------------------------------------

export function bookingConfirmed(d: BookingConfirmed): Rendered {
  const balance = d.total - d.paid
  const selfDrive = d.mode === 'self-drive'
  const body = [
    heading(`You're booked, ${esc(firstName(d.name))}.`),
    para(`Your ${esc(d.car.name)} is reserved. Show this reference at pickup or quote it when you message us.`),
    plate(d.ref),
    d.car.image ? photo(d.car.image, d.car.name) : '',
    journey({ label: 'Pickup', when: when(d.start), where: d.pickup }, { label: 'Return', when: when(d.end), where: d.dropoff }),
    rows([
      ['Car', carLine(d.car)],
      ['Driving', selfDrive ? 'Self-drive' : esc(`With a chauffeur${d.chauffeurName ? ` (${d.chauffeurName})` : ''}`)],
      ...d.lines.map((x) => [x.label, x.amount < 0 ? `&minus;${money(-x.amount)}` : money(x.amount)] as [string, string]),
      balance > 0 ? ['Paid so far', money(d.paid)] : null,
      balance > 0 ? ['Due at pickup', money(balance)] : null,
    ], { total: [balance > 0 ? 'Total' : 'Total paid', money(d.total)] }),
    d.deposit > 0
      ? callout(`<strong>Refundable deposit: ${money(d.deposit)}.</strong> We hold it on your card at pickup and release it within 3 working days of a clean return. Any deduction comes with photos.`)
      : '',
    button('View or change booking', d.manageUrl),
    subheading('Bring to pickup'),
    list(
      selfDrive
        ? ['The card you paid with', "Your driver's licence (the one you verified)", 'Your phone, for the check-out photos']
        : ['Your phone, so your chauffeur can reach you', 'Your booking reference'],
    ),
    para(`See you soon,<br/>${sign}`),
  ].join('')

  const text = [
    `You're booked, ${firstName(d.name)}.`,
    `Booking reference: ${d.ref}`,
    ``,
    `Car: ${d.car.name}${d.car.plate ? ` (${d.car.plate})` : ''}`,
    `Pickup: ${when(d.start)}, ${d.pickup}`,
    `Return: ${when(d.end)}, ${d.dropoff}`,
    `Driving: ${selfDrive ? 'Self-drive' : `With a chauffeur${d.chauffeurName ? ` (${d.chauffeurName})` : ''}`}`,
    `Total: ${money(d.total)} (paid ${money(d.paid)}${balance > 0 ? `, ${money(balance)} due at pickup` : ''})`,
    d.deposit > 0 ? `Refundable deposit: ${money(d.deposit)}, held at pickup, released within 3 working days of a clean return.` : '',
    ``,
    `View or change booking: ${d.manageUrl}`,
    ``,
    textFooter,
  ].filter((l) => l !== '').join('\n')

  return {
    subject: `Booking confirmed: ${d.car.name}, ${day(d.start)} (${d.ref})`,
    html: layout({ title: 'Booking confirmed', preheader: `Pickup ${when(d.start)} at ${d.pickup}. Reference ${d.ref}.`, body }),
    text,
  }
}

export function pickupReminder(d: PickupReminder): Rendered {
  const selfDrive = d.mode === 'self-drive'
  const body = [
    heading(`Your ${esc(d.car.name)} is ready tomorrow.`),
    para(selfDrive
      ? 'The car is cleaned, fuelled and waiting. Pickup takes about 10 minutes: a quick walk-round with photos, then the keys are yours.'
      : `Your chauffeur will be there 15 minutes early and will message you when they arrive.`),
    plate(d.ref),
    journey({ label: 'Pickup', when: when(d.start), where: d.pickup }, { label: 'Car', when: d.car.name, where: d.car.plate ?? '' }),
    d.chauffeur
      ? callout(`<strong>Your chauffeur: ${esc(d.chauffeur.name)}</strong><br/>Call or WhatsApp <a href="tel:${esc(d.chauffeur.phone)}" style="color:inherit;">${esc(d.chauffeur.phone)}</a> on the day.`)
      : '',
    selfDrive ? list(['The card you paid with', "Your driver's licence", 'Your phone, for the check-out photos']) : '',
    button('See booking details', d.manageUrl),
    para(`Running late or need a different time? Reply here or <a href="${whatsappLink(`Hi, it's about booking ${d.ref}`)}">WhatsApp us</a> and we'll adjust.`, { mute: true }),
  ].join('')

  return {
    subject: `Tomorrow: pickup at ${when(d.start).split(', ')[1]}, ${d.pickup}`,
    html: layout({ title: 'Pickup tomorrow', preheader: `${d.car.name} at ${d.pickup}, ${when(d.start)}. Reference ${d.ref}.`, body }),
    text: [
      `Your ${d.car.name} is ready tomorrow.`,
      `Reference: ${d.ref}`,
      `Pickup: ${when(d.start)}, ${d.pickup}`,
      d.chauffeur ? `Chauffeur: ${d.chauffeur.name}, ${d.chauffeur.phone}` : `Bring the card you paid with, your driver's licence and your phone.`,
      ``,
      `Booking details: ${d.manageUrl}`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export function returnReminder(d: ReturnReminder): Rendered {
  const body = [
    heading('Your return is due in 2 hours.'),
    para(`Please bring the ${esc(d.car.name)} back by <strong>${esc(when(d.end))}</strong>. Late returns are charged by the hour and can affect the next customer.`),
    journey({ label: 'Return by', when: when(d.end), where: d.dropoff }, { label: 'Booking', when: d.ref, where: d.car.name }),
    callout('<strong>Need more time?</strong> Extend now and the extra days are charged at your current rate, as long as the car is free.'),
    button('Extend my booking', d.extendUrl),
    subheading('Before you hand back'),
    list(['Fuel at the same level as pickup', 'Personal items out of the car, boot and glovebox', 'A minute for the return photos, which protect your deposit']),
    para(`Thanks for driving with us,<br/>${sign}`),
  ].join('')

  return {
    subject: `Return due ${when(d.end).split(', ')[1]} today (${d.ref})`,
    html: layout({ title: 'Return reminder', preheader: `Bring the ${d.car.name} to ${d.dropoff} by ${when(d.end)}, or extend in one tap.`, body }),
    text: [
      `Your return is due in 2 hours.`,
      `Return ${d.car.name} by ${when(d.end)} at ${d.dropoff}. Reference ${d.ref}.`,
      `Need more time? Extend: ${d.extendUrl}`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export function depositRefunded(d: DepositRefunded): Rendered {
  const deducted = d.deductions.reduce((s, x) => s + x.amount, 0)
  const refunded = Math.max(0, d.deposit - deducted)
  const clean = d.deductions.length === 0
  const body = [
    heading(clean ? 'Your full deposit is on its way back.' : 'Your deposit has been settled.'),
    para(clean
      ? `The car came back in great shape, so we've released the whole deposit for ${esc(d.ref)}.`
      : `We've finished checking the car for ${esc(d.ref)}. Here is exactly what was deducted and why. Photos of each item are on your booking page.`),
    rows([
      ['Deposit held', money(d.deposit)],
      ...d.deductions.map((x) => [esc(x.label), `&minus;${money(x.amount)}`] as [string, string]),
      ['Refunded to', esc(d.method)],
    ], { total: ['Refund', money(refunded)] }),
    callout('Banks usually show the refund within 3 to 5 working days. If it hasn\'t arrived after 5, reply to this email and we\'ll send the transfer reference.', clean ? 'ok' : 'info'),
    button(clean ? 'View receipt' : 'See photos and receipt', d.detailsUrl, clean ? 'primary' : 'secondary'),
    !clean ? para('If you disagree with a deduction, reply within 7 days with your own photos and a manager will review it.', { mute: true }) : '',
  ].join('')

  return {
    subject: `${money(refunded)} deposit refund for ${d.ref}`,
    html: layout({ title: 'Deposit refunded', preheader: clean ? `Full deposit of ${money(refunded)} released to ${d.method}.` : `${money(refunded)} refunded after ${money(deducted)} in deductions.`, body }),
    text: [
      clean ? 'Your full deposit is on its way back.' : 'Your deposit has been settled.',
      `Booking ${d.ref}`,
      `Deposit held: ${money(d.deposit)}`,
      ...d.deductions.map((x) => `${x.label}: -${money(x.amount)}`),
      `Refund: ${money(refunded)} to ${d.method}`,
      `Banks usually show it within 3 to 5 working days.`,
      ``,
      `Receipt: ${d.detailsUrl}`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export function reviewRequest(d: ReviewRequest): Rendered {
  const body = [
    heading(`How was the ${esc(d.car.name)}, ${esc(firstName(d.name))}?`),
    para('Thanks for renting with us. If the trip went well, a short Google review helps other people in Lagos, Abuja and Port Harcourt find a rental company they can trust.'),
    para('It takes under a minute, and we read every one.'),
    button('Leave a review', d.reviewUrl),
    divider(),
    para(`Something not right? Reply to this email instead. It goes straight to a manager, not a bot.`, { mute: true }),
  ].join('')

  return {
    subject: `How was your trip in the ${d.car.name}?`,
    html: layout({ title: 'How was your trip?', preheader: 'A one-minute review helps other renters find us. Thank you.', body }),
    text: [
      `How was the ${d.car.name}, ${firstName(d.name)}?`,
      `If the trip went well, a short Google review helps other renters find us: ${d.reviewUrl}`,
      `Something not right? Reply to this email and a manager will pick it up.`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export interface BookingExtended {
  name: string
  ref: string
  car: CarInfo
  days: number
  previousEnd: string
  newEnd: string
  dropoff: string
  extra: number
  total: number
  manageUrl: string
}

export function bookingExtended(d: BookingExtended): Rendered {
  const body = [
    heading(`Done. You have the car ${d.days === 1 ? 'one more day' : `${d.days} more days`}.`),
    para(`Your ${esc(d.car.name)} is now yours until <strong>${esc(when(d.newEnd))}</strong>. Nothing else about the booking has changed.`),
    plate(d.ref),
    journey({ label: 'Was due back', when: when(d.previousEnd), where: d.dropoff }, { label: 'Now due back', when: when(d.newEnd), where: d.dropoff }),
    rows([
      ['Extra days', `${d.days}`],
      ['Charged now', money(d.extra)],
    ], { total: ['New booking total', money(d.total)] }),
    button('View booking', d.manageUrl),
    para(`Enjoy the extra time,<br/>${sign}`),
  ].join('')

  return {
    subject: `Extended to ${when(d.newEnd)} (${d.ref})`,
    html: layout({ title: 'Booking extended', preheader: `${d.car.name} now due back ${when(d.newEnd)}. ${money(d.extra)} charged.`, body }),
    text: [
      `Your booking ${d.ref} is extended by ${d.days} day${d.days === 1 ? '' : 's'}.`,
      `${d.car.name} now due back ${when(d.newEnd)} at ${d.dropoff}.`,
      `Charged now: ${money(d.extra)}. New total: ${money(d.total)}.`,
      ``,
      `View booking: ${d.manageUrl}`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export interface BookingCancelled {
  name: string
  ref: string
  car: CarInfo
  start: string
  refund: number
  bookUrl: string
}

export function bookingCancelled(d: BookingCancelled): Rendered {
  const body = [
    heading('Your booking is cancelled.'),
    para(`We've cancelled ${esc(d.ref)}, the ${esc(d.car.name)} from ${esc(when(d.start))}.`),
    d.refund > 0
      ? rows([['Refund', money(d.refund)], ['Arrives in', '3 to 5 working days, to the card you paid with']])
      : '',
    callout(`Didn't cancel this yourself? Call <a href="tel:${brand.contact.phoneTel}" style="color:inherit;">${esc(brand.contact.phoneDisplay)}</a> straight away and we'll reinstate it if the car is still free.`, 'warn'),
    button('Book another car', d.bookUrl, 'secondary'),
  ].join('')

  return {
    subject: `Cancelled: ${d.ref}${d.refund > 0 ? `, ${money(d.refund)} refund on its way` : ''}`,
    html: layout({ title: 'Booking cancelled', preheader: d.refund > 0 ? `${money(d.refund)} goes back to your card within 5 working days.` : `${d.ref} is cancelled.`, body }),
    text: [
      `Booking ${d.ref} (${d.car.name}, ${when(d.start)}) is cancelled.`,
      d.refund > 0 ? `Refund: ${money(d.refund)}, back to your card in 3 to 5 working days.` : '',
      `Didn't cancel this yourself? Call ${brand.contact.phoneDisplay}.`,
      ``,
      textFooter,
    ].filter(Boolean).join('\n'),
  }
}

export interface Welcome {
  name: string
  points: number
  fleetUrl: string
}

export function welcome(d: Welcome): Rendered {
  const body = [
    heading(`Welcome to ${esc(brand.shortName)}, ${esc(firstName(d.name))}.`),
    para(`Your account is ready${d.points > 0 ? `, and we've added <strong>${d.points.toLocaleString('en-NG')} welcome points</strong> to it` : ''}.`),
    subheading('Three things that make renting with us easier'),
    list([
      '<strong>Verify once.</strong> Your NIN and licence check carries over to every future booking.',
      '<strong>Book on WhatsApp.</strong> Message us any time and the concierge can quote, book and extend.',
      '<strong>Transparent deposits.</strong> Every deduction comes with a photo. No surprises.',
    ]),
    button('Browse the fleet', d.fleetUrl),
    para(`Welcome aboard,<br/>${sign}`),
  ].join('')

  return {
    subject: `Welcome to ${brand.name}`,
    html: layout({ title: 'Welcome', preheader: 'Your account is ready. Verify once, book in minutes, track every deposit.', body }),
    text: [
      `Welcome to ${brand.shortName}, ${firstName(d.name)}.`,
      `Your account is ready${d.points > 0 ? ` and ${d.points} welcome points are on it` : ''}.`,
      `Browse the fleet: ${d.fleetUrl}`,
      ``,
      textFooter,
    ].join('\n'),
  }
}

export type EnquiryKind = 'contact' | 'corporate' | 'partner'

const enquiryCopy: Record<EnquiryKind, { heading: string; body: string; next: string[]; subject: string }> = {
  contact: {
    heading: 'We got your message.',
    body: 'Thanks for getting in touch. A member of the team will reply by email within a few hours.',
    next: ['We read your message and reply by email', 'For anything urgent, WhatsApp is fastest: a real person answers 24/7'],
    subject: 'We got your message',
  },
  corporate: {
    heading: 'Thanks. Your account manager will be in touch.',
    body: "We've received your corporate enquiry and passed it to our accounts team.",
    next: ['An account manager calls you within one working day', 'We agree rates, a credit limit and who can book', 'Your team books online or on WhatsApp, with one invoice each month'],
    subject: 'Your corporate enquiry',
  },
  partner: {
    heading: "Thanks. We'll be in touch about your car.",
    body: "We've received your request to list your car with us.",
    next: ['We call you within 2 working days to arrange an inspection', 'We check the car, papers and insurance, and fit a GPS tracker', 'Your car goes live and payouts start every month'],
    subject: 'Your request to list your car',
  },
}

export interface EnquiryReceived {
  kind: EnquiryKind
  name: string
}

export function enquiryReceived(d: EnquiryReceived): Rendered {
  const copy = enquiryCopy[d.kind]
  const body = [
    heading(copy.heading),
    para(`Hi ${esc(firstName(d.name))}, ${copy.body.charAt(0).toLowerCase()}${copy.body.slice(1)}`),
    subheading('What happens next'),
    list(copy.next),
    button('Message us on WhatsApp', whatsappLink(), 'secondary'),
    para(`Speak soon,<br/>${sign}`),
  ].join('')

  return {
    subject: `${copy.subject} | ${brand.name}`,
    html: layout({ title: copy.subject, preheader: copy.next[0], body }),
    text: [`Hi ${firstName(d.name)},`, copy.body, '', ...copy.next.map((x) => `- ${x}`), '', textFooter].join('\n'),
  }
}

export interface NewEnquiry {
  kind: EnquiryKind
  /** Label/value pairs from the form, in display order. */
  fields: Array<[string, string]>
  message?: string
  adminUrl: string
}

const enquiryTitle: Record<EnquiryKind, string> = { contact: 'New message from the website', corporate: 'New corporate enquiry', partner: 'New car owner wants to list' }

export function newEnquiry(d: NewEnquiry): Rendered {
  const who = d.fields.find(([l]) => l === 'Name' || l === 'Company')?.[1] ?? 'Someone'
  const body = [
    heading(esc(enquiryTitle[d.kind])),
    rows(d.fields.map(([l, v]) => [l, esc(v)] as [string, string])),
    d.message ? callout(esc(d.message).replaceAll('\n', '<br/>')) : '',
    button('Open admin', d.adminUrl),
  ].join('')

  return {
    subject: `${enquiryTitle[d.kind]}: ${who}`,
    html: layout({ title: enquiryTitle[d.kind], preheader: d.fields.map(([, v]) => v).join(', ').slice(0, 90), body, audience: 'staff' }),
    text: [enquiryTitle[d.kind], ...d.fields.map(([l, v]) => `${l}: ${v}`), d.message ? `\n${d.message}` : '', '', `Admin: ${d.adminUrl}`].join('\n'),
  }
}

// ---- staff --------------------------------------------------------------------

export function ownerDailySummary(d: OwnerDailySummary): Rendered {
  const change = d.revenueChange === 0 ? 'same as yesterday' : `${d.revenueChange > 0 ? 'up' : 'down'} ${Math.abs(Math.round(d.revenueChange * 100))}% on yesterday`
  const body = [
    heading(`${esc(day(d.date))}`),
    para(`Revenue was <strong>${money(d.revenue)}</strong>, ${change}.`),
    rows([
      ['New bookings', String(d.newBookings)],
      ['Pickups', String(d.pickups)],
      ['Returns', String(d.returns)],
      ['Fleet on the road', `${Math.round(d.utilisation * 100)}%`],
    ]),
    d.needsAttention.length
      ? subheading('Needs attention') + list(d.needsAttention.map(esc))
      : callout('Nothing needs attention today.', 'ok'),
    button('Open dashboard', d.dashboardUrl),
  ].join('')

  return {
    subject: `${brand.shortName} daily: ${money(d.revenue)}, ${d.newBookings} new booking${d.newBookings === 1 ? '' : 's'}${d.needsAttention.length ? `, ${d.needsAttention.length} to check` : ''}`,
    html: layout({ title: 'Daily summary', preheader: `${d.pickups} pickups, ${d.returns} returns, ${Math.round(d.utilisation * 100)}% of the fleet out.`, body, audience: 'staff' }),
    text: [
      `${day(d.date)}`,
      `Revenue: ${money(d.revenue)} (${change})`,
      `New bookings: ${d.newBookings} · Pickups: ${d.pickups} · Returns: ${d.returns} · On the road: ${Math.round(d.utilisation * 100)}%`,
      ...(d.needsAttention.length ? ['', 'Needs attention:', ...d.needsAttention.map((x) => `- ${x}`)] : []),
      ``,
      `Dashboard: ${d.dashboardUrl}`,
    ].join('\n'),
  }
}

export function alert(d: Alert): Rendered {
  const body = [
    heading(esc(d.title)),
    callout(esc(d.detail), d.severity),
    rows([
      ['When', esc(when(d.at))],
      d.car ? ['Car', esc(d.car)] : null,
      d.ref ? ['Booking', esc(d.ref)] : null,
    ]),
    button(d.actionLabel, d.actionUrl),
  ].join('')

  const prefix = d.severity === 'bad' ? 'Urgent: ' : ''
  return {
    subject: `${prefix}${d.title}${d.ref ? ` (${d.ref})` : ''}`,
    html: layout({ title: d.title, preheader: d.detail, body, audience: 'staff' }),
    text: [`${prefix}${d.title}`, d.detail, `When: ${when(d.at)}`, d.car ? `Car: ${d.car}` : '', d.ref ? `Booking: ${d.ref}` : '', ``, `${d.actionLabel}: ${d.actionUrl}`].filter(Boolean).join('\n'),
  }
}

// ---- Supabase Auth ------------------------------------------------------------
// Pasted into Supabase → Authentication → Emails. Supabase replaces {{ .ConfirmationURL }}.

const AUTH_URL = '{{ .ConfirmationURL }}'

export function authMagicLink({ url = AUTH_URL }: AuthLink = {}): Rendered {
  const body = [
    heading('Your sign-in link'),
    para(`Tap the button to sign in to ${esc(brand.name)}. The link works once and expires in 1 hour.`),
    button('Sign in', url),
    para("Didn't ask for this? You can ignore this email. Nobody can sign in without the link.", { mute: true }),
  ].join('')
  return {
    subject: `Your ${brand.shortName} sign-in link`,
    html: layout({ title: 'Sign in', preheader: 'One tap to sign in. The link expires in 1 hour.', body }),
    text: `Sign in to ${brand.name}: ${url}\nThe link works once and expires in 1 hour.`,
  }
}

export function authConfirmSignup({ url = AUTH_URL }: AuthLink = {}): Rendered {
  const body = [
    heading('Confirm your email'),
    para(`One step left. Confirm this address and your ${esc(brand.shortName)} account is ready for booking, trips and receipts.`),
    button('Confirm email', url),
    para("Didn't create an account? Ignore this email and nothing will happen.", { mute: true }),
  ].join('')
  return {
    subject: `Confirm your ${brand.shortName} account`,
    html: layout({ title: 'Confirm your email', preheader: 'Confirm your address to finish setting up your account.', body }),
    text: `Confirm your ${brand.shortName} account: ${url}`,
  }
}

export const templates = {
  booking_confirmed: bookingConfirmed,
  pickup_reminder: pickupReminder,
  return_reminder: returnReminder,
  deposit_refunded: depositRefunded,
  review_request: reviewRequest,
  booking_extended: bookingExtended,
  booking_cancelled: bookingCancelled,
  welcome,
  enquiry_received: enquiryReceived,
  new_enquiry: newEnquiry,
  owner_daily_summary: ownerDailySummary,
  alert,
  auth_magic_link: authMagicLink,
  auth_confirm_signup: authConfirmSignup,
} as const

export type TemplateName = keyof typeof templates
export type TemplateData<T extends TemplateName> = Parameters<(typeof templates)[T]>[0]

export function render<T extends TemplateName>(name: T, data: TemplateData<T>): Rendered {
  return (templates[name] as (d: TemplateData<T>) => Rendered)(data)
}
