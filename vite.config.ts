import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { brand } from './src/config/brand.ts'

/** Fills index.html meta tags, favicon and JSON-LD from src/config/brand.ts. */
function brandHtml(): Plugin {
  const favicon = brand.logoMarkPath
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${brand.colors.accent}"/><path transform="translate(4.8 4.8) scale(.7)" fill="${brand.colors.accentInk}" d="${brand.logoMarkPath}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${brand.colors.accent}"/><text x="32" y="46" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40" fill="${brand.colors.accentInk}">${brand.monogram}</text></svg>`
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
  const pages = ['/', '/fleet', '/book', '/business', '/earn', '/about', '/contact', '/faq', '/terms', '/privacy']
  return {
    name: 'brand-html',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /driver\nDisallow: /corporate\nDisallow: /partner\n\nSitemap: ${brand.siteUrl}/sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${brand.siteUrl}${p}</loc></url>`).join('\n')}\n</urlset>\n`,
      })
    },
    transformIndexHtml(html, ctx) {
      // Preload the public home route's lazy chunks so they don't load one after another.
      let preloads = ''
      if (ctx.bundle) {
        const wanted = /components\/site\/SiteLayout\.tsx$|pages\/site\/Home\.tsx$/
        const files = new Set<string>()
        const add = (name: string) => {
          const c = ctx.bundle![name]
          if (!c || c.type !== 'chunk' || files.has(name)) return
          files.add(name)
          // Only first-level shared chunks; deeper vendor chunks are requested in parallel anyway.
          if (files.size < 12) c.imports.forEach(add)
        }
        for (const [name, c] of Object.entries(ctx.bundle)) if (c.type === 'chunk' && c.facadeModuleId && wanted.test(c.facadeModuleId)) add(name)
        preloads = [...files].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('\n    ')
      }
      return html
        .replace('<!--PRELOADS-->', preloads)
        .replaceAll('%BRAND_TAGLINE%', brand.tagline)
        .replaceAll('%BRAND_PAPER%', brand.colors.paper)
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
