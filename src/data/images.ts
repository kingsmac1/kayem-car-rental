/**
 * Every image path in the app lives here so photos are easy to swap per client.
 * Placeholders are Unsplash photos (Unsplash License), resized to WebP in /public/images.
 * Each entry has a large file and a `-sm` 640px version for cards and phones.
 */

const car = (name: string) => `/images/cars/${name}.webp`
const scene = (name: string) => `/images/scenes/${name}.webp`

/** Small (640px) version of any image path from this file. */
export const sm = (path: string) => path.replace(/\.webp$/, '-sm.webp')

export const images = {
  hero: {
    photo: '/images/hero/hero.webp',
    photoSmall: '/images/hero/hero-sm.webp',
    /** Grayscale depth map: white = near, black = far. Replace with a generated one later (see README). */
    depth: '/images/hero/hero-depth.png',
    /** Static fallback for reduced motion / low-power devices. */
    fallback: '/images/hero/hero-fallback.webp',
    /** Optional ambient clip. Leave empty to hide the "Sound on" toggle. */
    video: '',
  },
  cars: {
    camry: car('camry'),
    corolla: car('corolla'),
    prado: car('prado'),
    landCruiser: car('land-cruiser'),
    landCruiserDesert: car('land-cruiser-desert'),
    lexusRx: car('lexus-rx'),
    lexusLx: car('lexus-lx'),
    gle: car('gle'),
    gleCoupe: car('gle-coupe'),
    sClass: car('s-class'),
    eClass: car('e-class'),
    gls: car('gls'),
    rangeRover: car('range-rover'),
    rangeRoverSport: car('range-rover-sport'),
    defender: car('defender'),
    hiace: car('hiace'),
    coaster: car('coaster'),
    elantra: car('elantra'),
    accord: car('accord'),
    fourRunner: car('4runner'),
    escalade: car('escalade'),
    yukon: car('yukon'),
    cx5: car('cx5'),
  },
  scenes: {
    interior: scene('interior'),
    interior2: scene('interior-2'),
    wheelNight: scene('wheel-night'),
    mercWheel: scene('merc-wheel'),
    lagosNight: scene('lagos-night'),
    lagosAerial: scene('lagos-aerial'),
    lagosDay: scene('lagos-day'),
    lagosSunset: scene('lagos-sunset'),
    door: scene('door'),
    wedding: scene('wedding'),
    weddingCouple: scene('wedding-couple'),
    darkLights: scene('dark-lights'),
    headlight: scene('headlight'),
    headlightBmw: scene('headlight-bmw'),
    headlight2: scene('headlight-2'),
    wetStreet: scene('wet-street'),
    streetNight: scene('street-night'),
    toyotaFront: scene('toyota-front'),
    corollaWheel: scene('corolla-wheel'),
    lcDetail: scene('lc-detail'),
    carDark: scene('car-dark'),
    mercFront: scene('merc-front'),
  },
} as const
