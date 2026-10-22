import { images } from '@/data/images'
import type { Car, CarCategory, DriveMode } from './types'
import type { City } from '@/config/brand'

const I = images.cars
const S = images.scenes

interface Spec {
  id: string
  make: string
  model: string
  year: number
  category: CarCategory
  city: City
  seats: number
  daily: number
  image: string
  extra: string[]
  colour: string
  fuel?: Car['fuel']
  modes?: DriveMode[]
  owner?: string
  features: string[]
  tagline: string
  featured?: boolean
  mileage: number
}

const specs: Spec[] = [
  { id: 'lc300-lag', make: 'Toyota', model: 'Land Cruiser 300', year: 2023, category: 'Luxury SUV', city: 'Lagos', seats: 7, daily: 260000, image: I.landCruiser, extra: [S.lcDetail, S.interior], colour: 'Black', fuel: 'Petrol', features: ['Armoured option', 'Rear entertainment', '4WD', 'Cooled seats'], tagline: 'The Lagos boardroom on wheels.', featured: true, mileage: 38200 },
  { id: 'lc-abj', make: 'Toyota', model: 'Land Cruiser V8', year: 2021, category: 'Luxury SUV', city: 'Abuja', seats: 7, daily: 230000, image: I.landCruiserDesert, extra: [S.interior2], colour: 'Silver', features: ['4WD', 'Leather', 'Sunroof', 'Interstate ready'], tagline: 'Built for Abuja to anywhere.', mileage: 71400 },
  { id: 'prado-lag', make: 'Toyota', model: 'Prado TXL', year: 2022, category: 'SUV', city: 'Lagos', seats: 7, daily: 150000, image: I.prado, extra: [S.interior], colour: 'Pearl white', features: ['4WD', '7 seats', 'Reverse camera', 'Apple CarPlay'], tagline: 'The family favourite for every road.', featured: true, mileage: 45900 },
  { id: 'prado-abj', make: 'Toyota', model: 'Prado VX', year: 2021, category: 'SUV', city: 'Abuja', seats: 7, daily: 140000, image: I.fourRunner, extra: [S.interior2], colour: 'Sky grey', features: ['4WD', '7 seats', 'Leather', 'Bluetooth'], tagline: 'Weekend escapes, sorted.', mileage: 62100, owner: 'p-ibrahim' },
  { id: 'camry-lag', make: 'Toyota', model: 'Camry XLE', year: 2022, category: 'Saloon', city: 'Lagos', seats: 5, daily: 65000, image: I.camry, extra: [S.toyotaFront, S.corollaWheel], colour: 'White', fuel: 'Hybrid', features: ['Hybrid', 'Lane assist', 'Apple CarPlay', 'Leather'], tagline: 'Quiet, efficient, always on time.', featured: true, mileage: 29800 },
  { id: 'camry-phc', make: 'Toyota', model: 'Camry SE', year: 2020, category: 'Saloon', city: 'Port Harcourt', seats: 5, daily: 55000, image: I.camry, extra: [S.corollaWheel], colour: 'White', features: ['Bluetooth', 'Reverse camera', 'Cruise control'], tagline: 'Everyday comfort around the Garden City.', mileage: 84300, owner: 'p-tamuno' },
  { id: 'corolla-lag', make: 'Toyota', model: 'Corolla', year: 2021, category: 'Saloon', city: 'Lagos', seats: 5, daily: 45000, image: I.corolla, extra: [S.toyotaFront], colour: 'White', features: ['Fuel saver', 'Bluetooth', 'Air conditioning'], tagline: 'Smart, simple, easy on fuel.', mileage: 56700 },
  { id: 'corolla-abj', make: 'Toyota', model: 'Corolla LE', year: 2022, category: 'Saloon', city: 'Abuja', seats: 5, daily: 45000, image: S.toyotaFront, extra: [S.corollaWheel], colour: 'White', features: ['Fuel saver', 'Apple CarPlay', 'Lane assist'], tagline: 'The no-fuss city runner.', mileage: 33100 },
  { id: 'elantra-lag', make: 'Hyundai', model: 'Elantra', year: 2024, category: 'Saloon', city: 'Lagos', seats: 5, daily: 50000, image: I.elantra, extra: [S.interior2], colour: 'Performance blue', features: ['Digital cockpit', 'Wireless charging', 'Apple CarPlay'], tagline: 'Sharp lines, sharper price.', mileage: 12400 },
  { id: 'accord-abj', make: 'Honda', model: 'Accord Sport', year: 2021, category: 'Saloon', city: 'Abuja', seats: 5, daily: 60000, image: I.accord, extra: [S.interior], colour: 'Crystal black', features: ['Turbo', 'Leather', 'Sunroof'], tagline: 'Executive feel without the price tag.', mileage: 48800 },
  { id: 'cx5-phc', make: 'Mazda', model: 'CX-5', year: 2022, category: 'SUV', city: 'Port Harcourt', seats: 5, daily: 75000, image: I.cx5, extra: [S.interior2], colour: 'Jet black', features: ['Bose audio', 'Leather', 'Reverse camera'], tagline: 'Compact SUV, grown-up comfort.', mileage: 27600 },
  { id: 'rx-lag', make: 'Lexus', model: 'RX 350', year: 2022, category: 'Luxury SUV', city: 'Lagos', seats: 5, daily: 140000, image: I.lexusRx, extra: [S.interior], colour: 'Graphite', features: ['Mark Levinson audio', 'Heated & cooled seats', 'Head-up display'], tagline: 'Quiet luxury for Lagos traffic.', featured: true, mileage: 31200 },
  { id: 'lx-abj', make: 'Lexus', model: 'LX 600', year: 2023, category: 'Luxury SUV', city: 'Abuja', seats: 7, daily: 380000, image: I.lexusLx, extra: [S.interior2, S.headlight2], colour: 'Black', features: ['Executive rear seats', 'Massage seats', '4WD', 'Fridge'], tagline: 'Diplomatic presence, unmistakable.', mileage: 18900, modes: ['chauffeur'] },
  { id: 'gle-lag', make: 'Mercedes-Benz', model: 'GLE 450', year: 2022, category: 'Luxury SUV', city: 'Lagos', seats: 5, daily: 200000, image: I.gle, extra: [S.mercWheel, S.mercFront], colour: 'Obsidian black', features: ['MBUX', 'Burmester audio', 'Air suspension'], tagline: 'Arrive like you mean it.', featured: true, mileage: 26500 },
  { id: 'glecoupe-lag', make: 'Mercedes-Benz', model: 'GLE 53 AMG Coupé', year: 2023, category: 'Luxury SUV', city: 'Lagos', seats: 5, daily: 270000, image: I.gleCoupe, extra: [S.mercWheel], colour: 'Polar white', features: ['AMG performance', 'Panoramic roof', 'Night package'], tagline: 'Weekend energy, AMG sound.', mileage: 9800, owner: 'p-adaeze' },
  { id: 'sclass-lag', make: 'Mercedes-Benz', model: 'S 580', year: 2023, category: 'Luxury Saloon', city: 'Lagos', seats: 4, daily: 420000, image: I.sClass, extra: [S.mercWheel, S.mercFront, S.interior], colour: 'Black', features: ['Executive rear seats', 'Massage seats', 'Burmester 4D', 'Chauffeur only'], tagline: 'The chairman’s car.', featured: true, mileage: 14200, modes: ['chauffeur'] },
  { id: 'eclass-abj', make: 'Mercedes-Benz', model: 'E 300', year: 2021, category: 'Luxury Saloon', city: 'Abuja', seats: 5, daily: 170000, image: I.eClass, extra: [S.mercWheel], colour: 'Black', features: ['Ambient lighting', 'Leather', 'Widescreen cockpit'], tagline: 'Polished for every meeting.', mileage: 52300 },
  { id: 'gls-abj', make: 'Mercedes-Benz', model: 'GLS 580', year: 2023, category: 'Luxury SUV', city: 'Abuja', seats: 7, daily: 320000, image: I.gls, extra: [S.interior2], colour: 'Black', features: ['7 seats', 'Rear tablets', 'Air suspension'], tagline: 'Seven seats of first class.', mileage: 16700, modes: ['chauffeur'] },
  { id: 'rr-lag', make: 'Land Rover', model: 'Range Rover Autobiography', year: 2023, category: 'Luxury SUV', city: 'Lagos', seats: 5, daily: 380000, image: I.rangeRover, extra: [S.headlight, S.interior], colour: 'Santorini black', features: ['Executive class seats', 'Meridian audio', 'Air suspension'], tagline: 'The quietest room in Lagos.', featured: true, mileage: 21900 },
  { id: 'rrs-phc', make: 'Land Rover', model: 'Range Rover Sport', year: 2022, category: 'Luxury SUV', city: 'Port Harcourt', seats: 5, daily: 280000, image: I.rangeRoverSport, extra: [S.headlight], colour: 'Carpathian grey', features: ['Terrain response', 'Meridian audio', 'Panoramic roof'], tagline: 'Port Harcourt’s statement SUV.', mileage: 34400 },
  { id: 'defender-abj', make: 'Land Rover', model: 'Defender 110', year: 2022, category: 'SUV', city: 'Abuja', seats: 6, daily: 300000, image: I.defender, extra: [S.lcDetail], colour: 'Gondwana stone', features: ['4WD', 'Air suspension', 'Interstate ready'], tagline: 'Goes where the road gives up.', mileage: 29100 },
  { id: 'escalade-lag', make: 'Cadillac', model: 'Escalade', year: 2022, category: 'Luxury SUV', city: 'Lagos', seats: 7, daily: 420000, image: I.escalade, extra: [S.streetNight], colour: 'Black raven', features: ['OLED cockpit', 'AKG audio', 'Super Cruise'], tagline: 'Wedding-day royalty.', mileage: 24600, modes: ['chauffeur'] },
  { id: 'yukon-phc', make: 'GMC', model: 'Yukon Denali', year: 2021, category: 'Luxury SUV', city: 'Port Harcourt', seats: 8, daily: 300000, image: I.yukon, extra: [S.streetNight], colour: 'Onyx black', features: ['8 seats', 'Bose audio', 'Escort-ready'], tagline: 'Big, calm and convoy-ready.', mileage: 58800 },
  { id: 'hiace-lag', make: 'Toyota', model: 'Hiace (14 seats)', year: 2021, category: 'Van', city: 'Lagos', seats: 14, daily: 95000, image: I.hiace, extra: [S.wetStreet], colour: 'White', fuel: 'Diesel', features: ['14 seats', 'Roof AC', 'Luggage space'], tagline: 'Airport runs and staff shuttles.', mileage: 98200, modes: ['chauffeur'] },
  { id: 'coaster-abj', make: 'Toyota', model: 'Coaster (30 seats)', year: 2020, category: 'Bus', city: 'Abuja', seats: 30, daily: 170000, image: I.coaster, extra: [S.wetStreet], colour: 'White', fuel: 'Diesel', features: ['30 seats', 'Full AC', 'PA system'], tagline: 'Events, tours and team travel.', mileage: 121300, modes: ['chauffeur'] },
]

const PLATE_PREFIX: Record<City, string[]> = {
  Lagos: ['LND', 'KJA', 'EKY', 'LSD', 'AAA'],
  Abuja: ['ABJ', 'GWA', 'KUJ', 'BWR'],
  'Port Harcourt': ['PHC', 'RSH', 'OBO'],
}

const round = (n: number, to: number) => Math.round(n / to) * to

export function buildCars(today: Date): Car[] {
  return specs.map((s, i) => {
    const prefix = PLATE_PREFIX[s.city][i % PLATE_PREFIX[s.city].length]
    const plate = `${prefix}-${String(100 + ((i * 37) % 899)).padStart(3, '0')}${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i * 7) % 26))}`
    const daysFrom = (n: number) => new Date(today.getTime() + n * 86_400_000).toISOString()
    // A few documents deliberately near/over expiry so the maintenance screen has work to show.
    const docOffsets =
      s.id === 'yukon-phc' ? [-6, 200, 120, 900] :
      s.id === 'accord-abj' ? [18, 9, 240, 900] :
      s.id === 'cx5-phc' ? [160, 25, 300, 900] :
      [120 + ((i * 41) % 200), 60 + ((i * 53) % 250), 90 + ((i * 29) % 220), 900]
    const docTypes = ['Vehicle licence', 'Insurance', 'Roadworthiness', 'Proof of ownership'] as const
    const serviceEveryKm = s.category === 'Bus' || s.category === 'Van' ? 7500 : 10000
    // Coaster is overdue for service to demo auto-blocking.
    const lastServiceKm = s.id === 'coaster-abj' ? s.mileage - 8900 : s.mileage - ((i * 1370) % (serviceEveryKm - 1500))
    return {
      id: s.id,
      make: s.make,
      model: s.model,
      year: s.year,
      category: s.category,
      city: s.city,
      seats: s.seats,
      transmission: 'Automatic',
      fuel: s.fuel ?? 'Petrol',
      colour: s.colour,
      plate,
      image: s.image,
      gallery: [s.image, ...s.extra],
      rates: {
        hourly: round(s.daily * 0.16, 500),
        daily: s.daily,
        weekly: round(s.daily * 6.2, 5000),
        monthly: round(s.daily * 22, 10000),
      },
      deposit: Math.max(100000, round(s.daily * 1.2, 50000)),
      modes: s.modes ?? ['self-drive', 'chauffeur'],
      status: 'available',
      mileage: s.mileage,
      serviceEveryKm,
      lastServiceKm,
      fuelLevel: 40 + ((i * 17) % 60),
      owner: s.owner ?? 'company',
      features: s.features,
      documents: docTypes.map((type, k) => ({
        type,
        number: `${type.split(' ').map((w) => w[0]).join('')}-${(i + 3) * 7919 + k * 131}`,
        expires: daysFrom(docOffsets[k]),
      })),
      tagline: s.tagline,
      featured: s.featured,
    }
  })
}

export const carName = (c: Pick<Car, 'make' | 'model'>) => `${c.make} ${c.model}`
