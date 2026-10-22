import type { StaffRole } from '@/mocks/types'

export const ROLES: StaffRole[] = ['Owner', 'Manager', 'Front Desk', 'Fleet Officer']

export const ROLE_INFO: Record<StaffRole, string> = {
  Owner: 'Everything, including finance, pricing and staff.',
  Manager: 'Daily operations, pricing and partners. No finance or staff settings.',
  'Front Desk': 'Bookings, customers, chauffeurs and the WhatsApp inbox. No revenue figures.',
  'Fleet Officer': 'Cars, tracking, inspections and maintenance.',
}

const ALL = ROLES
const access: Record<string, StaffRole[]> = {
  '/admin': ALL,
  '/admin/bookings': ['Owner', 'Manager', 'Front Desk'],
  '/admin/fleet': ['Owner', 'Manager', 'Fleet Officer'],
  '/admin/command': ['Owner', 'Manager', 'Fleet Officer'],
  '/admin/inspections': ['Owner', 'Manager', 'Fleet Officer', 'Front Desk'],
  '/admin/maintenance': ['Owner', 'Manager', 'Fleet Officer'],
  '/admin/customers': ['Owner', 'Manager', 'Front Desk'],
  '/admin/chauffeurs': ['Owner', 'Manager', 'Front Desk'],
  '/admin/pricing': ['Owner', 'Manager'],
  '/admin/finance': ['Owner'],
  '/admin/analyst': ['Owner', 'Manager'],
  '/admin/inbox': ['Owner', 'Manager', 'Front Desk'],
  '/admin/corporate': ['Owner', 'Manager'],
  '/admin/partners': ['Owner', 'Manager'],
  '/admin/marketing': ['Owner', 'Manager'],
  '/admin/settings': ['Owner'],
}

export function canAccess(role: StaffRole, path: string) {
  const key = path.replace(/\/$/, '') || '/admin'
  return (access[key] ?? ALL).includes(role)
}

/** Whether a role may see money figures. */
export const seesMoney = (role: StaffRole) => role === 'Owner' || role === 'Manager'
