import { brand } from '@/config/brand'
import type { City } from '@/config/brand'

export const customerSeeds: { name: string; city: City }[] = [
  { name: 'Chiamaka Okonkwo', city: 'Lagos' },
  { name: 'Tunde Bakare', city: 'Lagos' },
  { name: 'Aisha Bello', city: 'Abuja' },
  { name: 'Emeka Nwosu', city: 'Lagos' },
  { name: 'Funmilayo Adeyemi', city: 'Lagos' },
  { name: 'Ibrahim Musa', city: 'Abuja' },
  { name: 'Ngozi Eze', city: 'Port Harcourt' },
  { name: 'Oluwaseun Ajayi', city: 'Lagos' },
  { name: 'Halima Abubakar', city: 'Abuja' },
  { name: 'Tamunotonye Briggs', city: 'Port Harcourt' },
  { name: 'Kelechi Obi', city: 'Lagos' },
  { name: 'Zainab Yusuf', city: 'Abuja' },
  { name: 'Babatunde Ogunleye', city: 'Lagos' },
  { name: 'Ifeoma Chukwu', city: 'Lagos' },
  { name: 'Sodiq Lawal', city: 'Lagos' },
  { name: 'Blessing Etim', city: 'Port Harcourt' },
  { name: 'Yakubu Danjuma', city: 'Abuja' },
  { name: 'Adaobi Okafor', city: 'Lagos' },
  { name: 'Damilola Fashola', city: 'Lagos' },
  { name: 'Ebiere Alagoa', city: 'Port Harcourt' },
  { name: 'Musa Garba', city: 'Abuja' },
  { name: 'Temitope Oyelaran', city: 'Lagos' },
  { name: 'Chinedu Anozie', city: 'Abuja' },
  { name: 'Folake Odusanya', city: 'Lagos' },
  { name: 'Uche Madu', city: 'Port Harcourt' },
  { name: 'Hauwa Sani', city: 'Abuja' },
  { name: 'Segun Adebayo', city: 'Lagos' },
  { name: 'Nkechi Ibe', city: 'Lagos' },
  { name: 'Ayodele Coker', city: 'Lagos' },
  { name: 'Patience Akpan', city: 'Port Harcourt' },
  { name: 'Abdullahi Shehu', city: 'Abuja' },
  { name: 'Bukola Salami', city: 'Lagos' },
  { name: 'Obinna Ugwu', city: 'Abuja' },
  { name: 'Yewande Olatunji', city: 'Lagos' },
  { name: 'Ebuka Nnaji', city: 'Port Harcourt' },
  { name: 'Rukayat Bello', city: 'Lagos' },
  { name: 'Gbenga Akinola', city: 'Abuja' },
  { name: 'Ifeanyi Onyekachi', city: 'Lagos' },
  { name: 'Mariam Aliyu', city: 'Abuja' },
  { name: 'Victor Ikpe', city: 'Port Harcourt' },
  { name: 'Teniola Davies', city: 'Lagos' },
  { name: 'Kayode Fadipe', city: 'Lagos' },
]

export const chauffeurSeeds: { name: string; city: City; years: number; languages: string[] }[] = [
  { name: 'Sunday Okeke', city: 'Lagos', years: 12, languages: ['English', 'Igbo', 'Pidgin'] },
  { name: 'Adewale Ogundipe', city: 'Lagos', years: 9, languages: ['English', 'Yoruba'] },
  { name: 'Usman Abdullahi', city: 'Abuja', years: 14, languages: ['English', 'Hausa'] },
  { name: 'Peter Ekanem', city: 'Port Harcourt', years: 8, languages: ['English', 'Efik', 'Pidgin'] },
  { name: 'Kehinde Alabi', city: 'Lagos', years: 6, languages: ['English', 'Yoruba', 'French'] },
  { name: 'Jibril Mohammed', city: 'Abuja', years: 10, languages: ['English', 'Hausa', 'Arabic'] },
  { name: 'Godwin Amadi', city: 'Port Harcourt', years: 11, languages: ['English', 'Ikwerre', 'Pidgin'] },
  { name: 'Felix Oyebanji', city: 'Lagos', years: 5, languages: ['English', 'Yoruba'] },
]

export const corporateSeeds = [
  { id: 'co-zenith', name: 'Lekki Capital Partners', kind: 'Company', city: 'Lagos', contact: 'Ronke Adesina', email: 'travel@lekkicapital.demo', creditLimit: 6000000, discount: 0.12 },
  { id: 'co-embassy', name: 'Nordic Embassy Abuja (demo)', kind: 'Embassy', city: 'Abuja', contact: 'Ingrid Halvorsen', email: 'logistics@nordic-embassy.demo', creditLimit: 9000000, discount: 0.15 },
  { id: 'co-hotel', name: 'Harbour Point Hotel', kind: 'Hotel', city: 'Lagos', contact: 'Chidi Okoro', email: 'concierge@harbourpoint.demo', creditLimit: 4000000, discount: 0.1 },
  { id: 'co-events', name: 'Gold Ribbon Events', kind: 'Event planner', city: 'Lagos', contact: 'Tolu Bankole', email: 'hello@goldribbon.demo', creditLimit: 3000000, discount: 0.08 },
  { id: 'co-oil', name: 'Deltaline Energy Services', kind: 'Company', city: 'Port Harcourt', contact: 'Tonye Wokoma', email: 'fleet@deltaline.demo', creditLimit: 8000000, discount: 0.12 },
] as const

export const partnerSeeds = [
  { id: 'p-ibrahim', name: 'Ibrahim Danladi', city: 'Abuja', commission: 0.25, status: 'approved' },
  { id: 'p-tamuno', name: 'Tamuno Harry', city: 'Port Harcourt', commission: 0.25, status: 'approved' },
  { id: 'p-adaeze', name: 'Adaeze Nwachukwu', city: 'Lagos', commission: 0.2, status: 'approved' },
  { id: 'p-wale', name: 'Wale Adeniran', city: 'Lagos', commission: 0.25, status: 'pending' },
  { id: 'p-fatima', name: 'Fatima Lawan', city: 'Abuja', commission: 0.25, status: 'pending' },
] as const

const staffEmail = (u: string) => `${u}@${brand.slug}.demo`

export const staffSeeds = [
  { id: 's-owner', name: 'Emeka Okafor', role: 'Owner', email: staffEmail('owner') },
  { id: 's-manager', name: 'Bisola Adekunle', role: 'Manager', email: staffEmail('bisola') },
  { id: 's-desk', name: 'Grace Udoh', role: 'Front Desk', email: staffEmail('grace') },
  { id: 's-desk2', name: 'Aminu Bala', role: 'Front Desk', email: staffEmail('aminu') },
  { id: 's-fleet', name: 'Joseph Eze', role: 'Fleet Officer', email: staffEmail('joseph') },
] as const

export const reviewTexts = [
  'Car was spotless and the driver was early. Will book again for my next Lagos trip.',
  'Smooth airport pickup at MMA. WhatsApp booking took five minutes.',
  'Deposit refunded same day after return. Very transparent.',
  'Prado was perfect for the Abuja–Kaduna run. Clean and tracked, I felt safe.',
  'Our wedding convoy looked amazing. Chauffeurs were professional.',
  'Verification was quick, the selfie step was easy.',
  'Good car, but pickup was 20 minutes late. Support sorted it fast.',
  'Corporate account makes booking for our visitors effortless.',
]
