import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PublishedCount from '../components/PublishedCount'

describe('homepage message and footer', () => {
  it('renders the requested message once without needing a published count', () => {
    const html = renderToStaticMarkup(createElement(PublishedCount))
    expect(html.match(/Join other professionals with a live portfolio/g)).toHaveLength(1)
    expect(html).not.toMatch(/Join \d+ professionals/)
    const source = fs.readFileSync(path.resolve(__dirname, '../components/PublishedCount.tsx'), 'utf8')
    expect(source).not.toMatch(/supabase|useEffect|useState/)
  })

  it('aligns footer controls and keeps legal and cookie links on smaller screens', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../app/page.tsx'), 'utf8')
    const footer = source.slice(source.indexOf('<footer'), source.indexOf('</footer>'))
    expect(footer).toContain('flex-col items-center xl:flex-row')
    expect(footer).toContain('flex flex-wrap items-center justify-center')
    expect(footer).toContain('aria-label="Footer"')
    for (const href of ['/blog', '/terms', '/privacy', 'https://ecotronicsenterprise.com']) {
      expect(footer).toContain(`href="${href}"`)
    }
    expect(footer).toContain('<ContactLinks />')
    expect(footer).toContain('<CookieSettingsLink className="inline-flex items-center whitespace-nowrap')
  })

  it('uses the captured homepage specimen as the social share image', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf8')
    expect(source).toContain("const HOME_SHARE_IMAGE = 'https://liveportfolio.site/social/creative-portfolio-v1.png'")
    expect(source).toContain('width: 1200')
    expect(source).toContain('height: 630')
    expect(source).toContain('images: [HOME_SHARE_IMAGE]')
    expect(fs.existsSync(path.resolve(__dirname, '../public/social/creative-portfolio-v1.png'))).toBe(true)
  })
})
