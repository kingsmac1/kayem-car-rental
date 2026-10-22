import type { Location } from './types'

export const locations: Location[] = [
  // Lagos
  { id: 'los-intl', city: 'Lagos', name: 'Murtala Muhammed Intl Airport (LOS), Ikeja', kind: 'airport', lat: 6.5774, lng: 3.3212 },
  { id: 'los-mma2', city: 'Lagos', name: 'MMA2 Domestic Terminal, Ikeja', kind: 'airport', lat: 6.5631, lng: 3.3366 },
  { id: 'lag-lekki', city: 'Lagos', name: 'Emkay Lekki office, Admiralty Way', kind: 'office', lat: 6.4474, lng: 3.4722 },
  { id: 'lag-vi', city: 'Lagos', name: 'Eko Hotel, Victoria Island', kind: 'hotel', lat: 6.4253, lng: 3.4307 },
  { id: 'lag-ikoyi', city: 'Lagos', name: 'Ikoyi (Bourdillon Road)', kind: 'area', lat: 6.4487, lng: 3.4342 },
  { id: 'lag-gra', city: 'Lagos', name: 'Ikeja GRA', kind: 'area', lat: 6.5833, lng: 3.3557 },
  { id: 'lag-ajah', city: 'Lagos', name: 'Ajah, Lekki-Epe Expressway', kind: 'area', lat: 6.4683, lng: 3.5684 },
  // Abuja
  { id: 'abv-intl', city: 'Abuja', name: 'Nnamdi Azikiwe Intl Airport (ABV)', kind: 'airport', lat: 9.0068, lng: 7.2632 },
  { id: 'abj-wuse', city: 'Abuja', name: 'Emkay Wuse 2 office, Aminu Kano Crescent', kind: 'office', lat: 9.0817, lng: 7.4702 },
  { id: 'abj-maitama', city: 'Abuja', name: 'Maitama', kind: 'area', lat: 9.0882, lng: 7.4934 },
  { id: 'abj-hilton', city: 'Abuja', name: 'Transcorp Hilton, Maitama', kind: 'hotel', lat: 9.0721, lng: 7.4932 },
  { id: 'abj-asokoro', city: 'Abuja', name: 'Asokoro', kind: 'area', lat: 9.0444, lng: 7.5266 },
  { id: 'abj-garki', city: 'Abuja', name: 'Garki Area 11', kind: 'area', lat: 9.0378, lng: 7.4916 },
  // Port Harcourt
  { id: 'phc-intl', city: 'Port Harcourt', name: 'Port Harcourt Intl Airport (PHC), Omagwa', kind: 'airport', lat: 5.0155, lng: 6.9496 },
  { id: 'phc-gra', city: 'Port Harcourt', name: 'Emkay GRA Phase 2 office', kind: 'office', lat: 4.8156, lng: 7.0049 },
  { id: 'phc-transamadi', city: 'Port Harcourt', name: 'Trans-Amadi Industrial Layout', kind: 'area', lat: 4.8133, lng: 7.0385 },
  { id: 'phc-presidential', city: 'Port Harcourt', name: 'Hotel Presidential, Aba Road', kind: 'hotel', lat: 4.8241, lng: 7.0144 },
]

export const locationById = (id: string) => locations.find((l) => l.id === id)
export const locationName = (id: string) => locationById(id)?.name ?? id
export const cityCentre = {
  Lagos: [6.4935, 3.4100] as [number, number],
  Abuja: [9.0579, 7.4951] as [number, number],
  'Port Harcourt': [4.8242, 7.0336] as [number, number],
}
