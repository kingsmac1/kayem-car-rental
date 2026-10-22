import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { brand } from './src/config/brand.ts'

/** Fills index.html meta tags, favicon and JSON-LD from src/config/brand.ts. */
function brandHtml(): Plugin {
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${brand.colors.ink}"/><rect x="6" y="6" width="52" height="52" fill="${brand.colors.accent}"/><text x="32" y="46" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="${brand.colors.accentInk}">${brand.monogram}</text></svg>`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: brand.name,
    slogan: brand.tagline,
    description: brand.description,
    url: brand.siteUrl,
    telephone: brand.contact.phoneTel,
    email: brand.contact.email,
    priceRange: '₦₦₦',
    currenciesAccepted: brand.currency.code,
    address: { '@type': 'PostalAddress', streetAddress: brand.contact.address, addressCountry: 'NG' },
    areaServed: brand.cities.map((c) => ({ '@type': 'City', name: c })),
    openingHours: 'Mo-Su 00:00-23:59',
    sameAs: Object.values(brand.social),
  }
  const title = `${brand.name} | ${brand.tagline}`
  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return html
        .replaceAll('%BRAND_TITLE%', title)
        .replaceAll('%BRAND_NAME%', brand.name)
        .replaceAll('%BRAND_DESC%', brand.description)
        .replaceAll('%BRAND_URL%', brand.siteUrl)
        .replaceAll('%BRAND_INK%', brand.colors.ink)
        .replaceAll('%BRAND_ACCENT%', brand.colors.accent)
        .replaceAll('%BRAND_FONTS%', brand.fonts.googleHref)
        .replaceAll('%BRAND_FAVICON%', 'data:image/svg+xml,' + encodeURIComponent(favicon))
        .replace('%BRAND_JSONLD%', JSON.stringify(jsonLd))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandHtml()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
})
