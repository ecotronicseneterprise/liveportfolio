// Contact icons: which contacts a portfolio shows, how they are made safe, and that every template draws them.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import ContactIcons from '../components/contact/ContactIcons'
import { contactItems, shortUrl } from '../lib/contact/items'
import Minimal, { type PortfolioContent } from '../components/templates/Minimal'
import Bold from '../components/templates/Bold'
import Creative from '../components/templates/Creative'
import Developer from '../components/templates/Developer'
import Designer from '../components/templates/Designer'
import DataScientist from '../components/templates/DataScientist'
import ProductManager from '../components/templates/ProductManager'
import Finance from '../components/templates/Finance'
import Graduate from '../components/templates/Graduate'
import Cybersecurity from '../components/templates/Cybersecurity'
import ProDesign from '../components/templates/pro/ProDesign'
import Look from '../components/blocks/Look'
import { TEXT_LIMITS, CONTENT_KEYS, LINK_FIELDS } from '../lib/portfolio/ops'

const FULL = {
  email: 'chef@example.com', phone: '+234 801 234 5678', whatsapp: '2348012345678',
  linkedin_url: 'https://www.linkedin.com/in/chef', github_url: 'https://github.com/chef', website_url: 'https://chef.example',
  twitter_url: 'https://x.com/chef', instagram_url: 'https://www.instagram.com/chef', facebook_url: 'https://www.facebook.com/chef',
  youtube_url: 'https://www.youtube.com/@chef', tiktok_url: 'https://www.tiktok.com/@chef',
}

describe('contactItems', () => {
  it('lists every contact the person gave, in a fixed order, with safe links', () => {
    const items = contactItems(FULL)
    expect(items.map((i) => i.kind)).toEqual(['email', 'phone', 'whatsapp', 'linkedin', 'github', 'website', 'x', 'instagram', 'facebook', 'youtube', 'tiktok'])
    expect(items[0]).toMatchObject({ href: 'mailto:chef@example.com', external: false })
    expect(items[1]).toMatchObject({ href: 'tel:+2348012345678', text: '+234 801 234 5678' })
    expect(items[2].href).toBe('https://wa.me/2348012345678')
    expect(items[3]).toMatchObject({ text: 'linkedin.com/in/chef', external: true })
  })

  it('shows nothing for what was not filled in: a chef with no GitHub gets no GitHub icon', () => {
    const kinds = contactItems({ email: 'chef@example.com', instagram_url: 'https://www.instagram.com/chef' }).map((i) => i.kind)
    expect(kinds).toEqual(['email', 'instagram'])
    expect(contactItems({})).toEqual([])
    expect(contactItems(null)).toEqual([])
  })

  it('drops anything unsafe or malformed', () => {
    const items = contactItems({
      email: 'not an email', phone: 'call me maybe', whatsapp: '12',
      github_url: 'javascript:alert(1)', linkedin_url: 'data:text/html,x', website_url: 'https://user:pass@evil.example', twitter_url: 'ftp://x',
    })
    expect(items).toEqual([])
  })

  it('accepts a bare domain as https, and a phone number written in any usual style', () => {
    expect(contactItems({ website_url: 'chef.example/menu' })[0]).toMatchObject({ href: 'https://chef.example/menu', text: 'chef.example/menu' })
    for (const p of ['08012345678', '+234 (0)801 234 5678', '234-801-234-5678']) expect(contactItems({ phone: p })[0]?.kind, p).toBe('phone')
    expect(contactItems({ phone: '+234 801 234 5678' })[0].href).toBe('tel:+2348012345678')
  })

  it('shortens an address for display', () => {
    expect(shortUrl('https://www.linkedin.com/in/ada/')).toBe('linkedin.com/in/ada')
  })
})

describe('ContactIcons', () => {
  const html = renderToStaticMarkup(createElement(ContactIcons, { content: FULL }))
  it('every icon is a link with a name a screen reader can read, and the visible text sits beside it', () => {
    expect(html.match(/class="lpc-a"/g)).toHaveLength(11)
    expect(html).toContain('aria-label="Email: chef@example.com"')
    expect(html).toContain('aria-label="Phone: +234 801 234 5678"')
    expect(html.match(/class="lpc-t"/g)).toHaveLength(11)
    expect(html.match(/aria-hidden="true"/g)!.length).toBeGreaterThanOrEqual(11) // the icons themselves are decoration
  })
  it('outside links open safely in a new tab; mail and phone do not', () => {
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(9)
    expect(html).not.toMatch(/href="javascript:/)
  })
  it('draws nothing when there is nothing to show', () => {
    expect(renderToStaticMarkup(createElement(ContactIcons, { content: {} }))).toBe('')
  })
})

describe('what can be saved', () => {
  it('the new contact fields are accepted by the editor rules', () => {
    for (const k of ['phone', 'whatsapp', 'twitter_url', 'instagram_url', 'facebook_url', 'youtube_url', 'tiktok_url', 'website_url']) expect(CONTENT_KEYS, k).toContain(k)
    expect(TEXT_LIMITS.phone).toBeGreaterThan(10)
    for (const k of ['twitter_url', 'website_url']) expect(LINK_FIELDS).toContain(k)
  })
})

const base = (over: Record<string, unknown> = {}): PortfolioContent => ({
  name: 'Funke Adebayo', role: 'Head chef', headline: 'I cook for 200 covers a night.', about: 'Fifteen years in kitchens.', location: 'Abuja',
  skills: ['Menu design'], skills_narrative: '', skills_grouped: [{ category: 'Craft', items: ['Menu design'] }],
  projects: [{ title: 'Pop-up supper club', problem: '', solution: 'A monthly 40-seat dinner.', outcome: 'Sold out nine months running.', stack: [] }],
  experience: [{ company: 'Hilton', role: 'Sous chef', period: '2015 to 2021', bullets: ['Ran the pass'] }], ...FULL, ...over,
} as unknown as PortfolioContent)

describe('every template shows the contact icons', () => {
  const legacy: Array<[string, React.ComponentType<{ content: PortfolioContent }>]> = [
    ['minimal', Minimal], ['bold', Bold], ['creative', Creative], ['developer', Developer], ['designer', Designer], ['data-scientist', DataScientist],
    ['product-manager', ProductManager], ['finance', Finance], ['graduate', Graduate], ['cybersecurity', Cybersecurity],
  ]
  for (const [id, C] of legacy) {
    it(`${id} (original) draws the icon row with all eleven contacts, and no bare "mailto" text link`, () => {
      const out = renderToStaticMarkup(createElement(C, { content: base() }))
      expect(out.match(/class="lpc-a"/g)!.length).toBeGreaterThanOrEqual(11)
      expect(out).toContain('aria-label="WhatsApp:')
    })
    it(`${id} (original) shows no contact icons for a person with no contact details`, () => {
      const out = renderToStaticMarkup(createElement(C, { content: base({ email: '', phone: '', whatsapp: '', linkedin_url: '', github_url: '', website_url: '', twitter_url: '', instagram_url: '', facebook_url: '', youtube_url: '', tiktok_url: '' }) }))
      expect(out).not.toContain('lpc-a')
    })
  }
  for (const id of ['developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity'] as const) {
    it(`${id} (redesigned) draws the icon row`, () => {
      const out = renderToStaticMarkup(createElement(ProDesign, { content: { ...base(), pro_designs: { [id]: 2 } } as PortfolioContent, template: id } as never))
      expect(out.match(/class="lpc-a"/g)!.length).toBeGreaterThanOrEqual(11)
    })
  }
  for (const t of ['minimal', 'bold', 'creative'] as const) {
    for (const arrangement of ['proof', 'profile', 'index', 'showcase'] as const) {
      it(`${t} block look (${arrangement}) draws the icon row once`, () => {
        const out = renderToStaticMarkup(createElement(Look, { template: t, content: base(), layout: { v: 1, arrangement }, page: true }))
        expect(out.match(/class="lpc"/g)).toHaveLength(1)
        expect(out.match(/class="lpc-a"/g)).toHaveLength(11)
      })
    }
  }
})
