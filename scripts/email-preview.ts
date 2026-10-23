/**
 * Renders every email template with sample data so you can look at them in a browser.
 *
 *   npm run email:preview            → email-previews/index.html
 *
 * Also writes the two Supabase Auth templates to supabase/templates/, ready to
 * paste into Supabase → Authentication → Emails.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, templates, type TemplateName } from '../supabase/functions/_shared/email/templates.ts'
import { samples } from '../supabase/functions/_shared/email/samples.ts'
import { brand } from '../src/config/brand.ts'

const outDir = 'email-previews'
mkdirSync(outDir, { recursive: true })

const names = Object.keys(templates) as TemplateName[]
for (const name of names) {
  const email = render(name, samples[name] as never)
  // Images live on the deployed site; point previews at the local copies so they show before deploy.
  writeFileSync(join(outDir, `${name}.html`), email.html.replaceAll(`${brand.siteUrl}/email/`, '../public/email/'))
  writeFileSync(join(outDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}\n`)
}

const index = `<!doctype html><meta charset="utf-8"><title>Email previews</title>
<style>body{font:15px system-ui;margin:24px;background:#ddd}a{display:block;margin:6px 0}</style>
<h1>Email previews</h1>${names.map((n) => `<a href="${n}.html">${n}</a>`).join('')}`
writeFileSync(join(outDir, 'index.html'), index)

mkdirSync('supabase/templates', { recursive: true })
writeFileSync('supabase/templates/magic_link.html', render('auth_magic_link', {}).html)
writeFileSync('supabase/templates/confirmation.html', render('auth_confirm_signup', {}).html)

console.log(`Wrote ${names.length} previews to ${outDir}/ and 2 auth templates to supabase/templates/`)
