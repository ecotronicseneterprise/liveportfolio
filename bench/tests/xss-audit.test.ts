// Stored-XSS audit of user-controlled portfolio content. Production code is NOT changed.
// Tests named "VULNERABLE" assert the CURRENT (unsafe) behaviour so the finding is reproducible; when the fix
// ships they should be flipped (the "proposed fix" tests show what the fix must satisfy).
//
// Audit summary (grep of app/, components/, lib/, hooks/):
//   dangerouslySetInnerHTML     : 8 pages for static JSON-LD (blog, home, what-is-a-portfolio) — constants, safe;
//                                 app/portfolio/[slug]/page.tsx:228 — JSON-LD built from USER content — see below.
//   innerHTML / eval / document.write / new Function : none.
//   href={content.github_url|linkedin_url|project.url} in 9 templates : unvalidated scheme.
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const personSchema = (c: Record<string, string>) => ({
  '@context': 'https://schema.org', '@type': 'Person', name: c.name, jobTitle: c.role, description: c.headline,
  email: c.email, address: { '@type': 'PostalAddress', addressLocality: c.location },
})
// exactly what app/portfolio/[slug]/page.tsx does today
const renderCurrent = (c: Record<string, string>) =>
  renderToString(React.createElement('script', { type: 'application/ld+json', dangerouslySetInnerHTML: { __html: JSON.stringify(personSchema(c)) } }))

// proposed: escape characters that can terminate or open tags/comments inside a <script> element
const safeJsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
const renderFixed = (c: Record<string, string>) =>
  renderToString(React.createElement('script', { type: 'application/ld+json', dangerouslySetInnerHTML: { __html: safeJsonLd(personSchema(c)) } }))

const PAYLOAD = '</script><script>alert(document.domain)</script>'
const hostile = { name: PAYLOAD, role: 'x', headline: 'x', email: 'a@b.co', location: 'x' }

describe('JSON-LD in app/portfolio/[slug]/page.tsx', () => {
  it('VULNERABLE: a name/role/headline/location containing </script> breaks out of the JSON-LD block', () => {
    const html = renderCurrent(hostile)
    const scripts = html.match(/<script/g)?.length ?? 0
    expect(scripts).toBe(2) // an attacker-controlled second <script> element exists
    expect(html).toContain('<script>alert(document.domain)</script>')
  })

  it('every user-controlled field is a vector (name, role, headline, location, email)', () => {
    for (const k of ['name', 'role', 'headline', 'location', 'email']) {
      const html = renderCurrent({ ...hostile, name: 'ok', role: 'ok', headline: 'ok', email: 'a@b.co', location: 'ok', [k]: PAYLOAD })
      expect((html.match(/<script/g) ?? []).length, k).toBe(2)
    }
  })

  it('proposed fix: escaping < > & as \\uXXXX keeps a single script element and round-trips the data', () => {
    const html = renderFixed(hostile)
    expect((html.match(/<script/g) ?? []).length).toBe(1)
    expect(html).not.toContain('</script><script>')
    const json = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
    expect(JSON.parse(json).name).toBe(PAYLOAD) // JSON.parse understands the escapes: data unchanged
  })
})

describe('where hostile content can come from', () => {
  it('/api/update stores any string for name/role/about/headline/location/email/urls (no sanitisation of values) — by design of the allow-list only', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('../../app/api/update/route.ts', import.meta.url), 'utf8')
    expect(src).toContain('ALLOWED_CONTENT_KEYS') // key allow-list exists
    expect(/stripHtml|escapeHtml|DOMPurify|sanitizeHtml/.test(src)).toBe(false) // …but no value sanitiser
  })

  it('/api/generate strips tags from INPUT but AI output (headline, about, seo_*) is stored as returned', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('../../app/api/generate/route.ts', import.meta.url), 'utf8')
    expect(src).toContain("text.replace(/<[^>]*>/g, '')")
  })
})

describe('javascript: / data: URLs in href (templates render content.github_url, linkedin_url, project.url unchecked)', () => {
  it('React 19 neutralises javascript: hrefs at render time (defence in depth, not validation)', () => {
    const html = renderToString(React.createElement('a', { href: 'javascript:alert(document.domain)' }, 'x'))
    expect(html).not.toContain('href="javascript:alert')
    expect(html).toContain('React has blocked a javascript: URL')
  })

  it('but other schemes pass through unchanged (data:, vbscript:, mailto:, custom) — only http(s) should be allowed', () => {
    for (const u of ['data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'intent://x#Intent;scheme=http;end']) {
      expect(renderToString(React.createElement('a', { href: u }, 'x')), u).toContain(`href="${u.replace(/&/g, '&amp;')}"`)
    }
  })
})
