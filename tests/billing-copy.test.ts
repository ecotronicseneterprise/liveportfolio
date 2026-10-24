// The wording customers read must match how checkout works (one payment, 12 months, no renewal, 7-day guarantee), prices are shown in Naira
// with dollars only as a labelled estimate, there is exactly one support address, and the browser never chooses a price.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ region: null as null | 'NG' | 'INTL' }))
vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: h.region, loading: h.region === null }) }))
vi.mock('@/hooks/useUsdRate', () => ({ useUsdRate: () => ({ basicUsd: '10.12', proUsd: '30.36', rateLoading: false }) }))

import TermsPage from '../app/terms/page'
import PricingSection from '../components/PricingSection'
import PriceTag from '../components/PriceTag'
import LocalisedPrice from '../components/LocalisedPrice'
import ReturnClient from '../app/checkout/return/ReturnClient'
import { BILLING_COPY, formatNaira } from '../lib/billing/copy'
import { SUPPORT_EMAIL } from '../lib/brand'
import { PLANS } from '../lib/plans'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(rel, out) }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel)
  }
  return out
}

describe('there is no rollout flag and no second checkout', () => {
  it('CHECKOUT_V2 and the old plan-code popup are gone from the app', () => {
    const files = [...walk('app'), ...walk('components'), ...walk('lib')]
    expect(files.filter((f) => /CHECKOUT_V2|checkoutMode|checkoutEnabledFor|PaystackPop|js\.paystack\.co|checkout_v2_disabled/.test(read(f)))).toEqual([])
    expect(fs.existsSync(path.join(ROOT, 'lib/billing/flag.ts'))).toBe(false)
  })
  it('the modal never falls back to a subscription: no plan codes in client code', () => {
    const files = [...walk('app'), ...walk('components')].filter((f) => !f.startsWith('app/api'))
    expect(files.filter((f) => /NEXT_PUBLIC_PAYSTACK_(BASIC|PRO|TEST)_PLAN_CODE|NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY/.test(read(f)))).toEqual([])
  })
})

describe('Terms of Service', () => {
  const t = text(createElement(TermsPage))
  it('one payment for 12 months, no automatic renewal, nothing to cancel', () => {
    expect(t).toMatch(/single payment that gives you 12 months/i)
    expect(t).toMatch(/no automatic renewal/i)
    expect(t).not.toMatch(/renew automatically unless cancelled|may cancel your subscription|annual subscription|billed annually/i)
  })
  it('does not promise reminder e-mails that are not built', () => expect(t).not.toMatch(/we email you before/i))
  it('a real 7-day refund guarantee, through Paystack, ending the plan', () => {
    expect(t).toMatch(/7-day guarantee/i)
    expect(t).toMatch(/within 7 days of your purchase/i)
    expect(t).toMatch(/refund the full amount you paid, whether or not you have published/i)
    expect(t).toMatch(/paid plan ends and your portfolio is unpublished/i)
    expect(t).not.toMatch(/at our discretion|may not apply/i)
  })
  it('uses the one support address', () => expect(t).toContain(SUPPORT_EMAIL))
})

describe('prices are shown in Naira; dollars are only a labelled estimate', () => {
  it('formatNaira and the plan table agree', () => {
    expect(formatNaira(15000)).toBe('₦15,000'); expect(formatNaira(45000)).toBe('₦45,000'); expect(formatNaira(500)).toBe('₦500')
    expect(formatNaira(PLANS.basic.priceNgn!)).toBe('₦15,000'); expect(formatNaira(PLANS.pro.priceNgn!)).toBe('₦45,000')
  })
  it.each([[null], ['NG'], ['INTL']] as const)('PriceTag in region %s always shows the Naira price and "for 12 months"', (region) => {
    h.region = region
    for (const [plan, naira] of [['basic', '₦15,000'], ['pro', '₦45,000']] as const) {
      const t = text(createElement(PriceTag, { plan, variant: 'modal' }))
      expect(t).toContain(naira); expect(t).toContain('for 12 months')
    }
  })
  it('outside Nigeria only, a dollar ESTIMATE is added and says you are charged in Naira; in Nigeria no dollars appear', () => {
    h.region = 'INTL'
    const intl = text(createElement(PriceTag, { plan: 'basic', variant: 'section' }))
    expect(intl).toMatch(/About \$10\.12 at today's rate/); expect(intl).toContain('charged in Naira')
    h.region = 'NG'
    expect(text(createElement(PriceTag, { plan: 'basic', variant: 'section' }))).not.toContain('$')
    h.region = null
    expect(text(createElement(PriceTag, { plan: 'pro', variant: 'section' }))).not.toContain('$')
  })
  it('LocalisedPrice never replaces the Naira price with dollars', () => {
    h.region = 'INTL'
    const t = text(createElement(LocalisedPrice, { ngn: '₦15,000 for 12 months', usd: '$10' }))
    expect(t.trim().startsWith('₦15,000 for 12 months')).toBe(true); expect(t).toContain('about $10'); expect(t).toContain('charged in Naira')
    h.region = 'NG'
    expect(text(createElement(LocalisedPrice, { ngn: '₦15,000 for 12 months', usd: '$10' })).trim()).toBe('₦15,000 for 12 months')
  })
  it('the pricing section shows Naira for everyone, the matching note, and no leftover "/year" prices', () => {
    for (const region of ['NG', 'INTL', null] as const) {
      h.region = region
      const t = text(createElement(PricingSection))
      expect(t).toContain('₦15,000'); expect(t).toContain('₦45,000'); expect(t).toContain(BILLING_COPY.pricingNote)
      expect(t).not.toMatch(/\/year|Subscribe to publish|Cancel anytime|Refunds reviewed within 7 days/)
    }
  })
  it('no page hard-codes a per-year or dollar-only price any more', () => {
    const files = [...walk('app'), ...walk('components')].filter((f) => !f.startsWith('app/blog') && !f.startsWith('app/api') && !f.includes('test-templates'))
    expect(files.filter((f) => /₦\d[\d,]*\/year|\$10\/year|\$30\/year|usd="\$\d+\/year/.test(read(f)))).toEqual([])
  })
})

describe('the old over-promising lines are gone', () => {
  it('no hard-coded refund or cancellation promise outside lib/billing/copy.ts and the Terms', () => {
    const files = [...walk('app'), ...walk('components')].filter((f) => !f.startsWith('app/terms'))
    expect(files.filter((f) => /7-day refund if you publish and change your mind|Refunds reviewed within 7 days of purchase|plans can be cancelled anytime|Annual billing · 7-day refund guarantee · Cancel anytime/.test(read(f)))).toEqual([])
  })
})

describe('one support address', () => {
  it('the other address is gone everywhere', () => {
    const files = [...walk('app'), ...walk('components'), ...walk('lib')]
    expect(files.filter((f) => /support@liveportfolio\.site/.test(read(f)))).toEqual([])
    expect(SUPPORT_EMAIL).toBe('support@ecotronicsenterprise.com')
  })
  it('the upgrade modal, the return page and the billing panel use the constant', () => {
    for (const f of ['components/UpgradeModal.tsx', 'app/checkout/return/ReturnClient.tsx', 'components/dashboard/PlanBillingPanel.tsx']) expect(read(f)).toMatch(/SUPPORT_EMAIL/)
  })
})

describe('the browser never chooses a price', () => {
  it('the modal sends the tier name only to /api/checkout', () => {
    const src = read('components/UpgradeModal.tsx')
    const call = /fetch\('\/api\/checkout', \{[\s\S]*?\}\)/.exec(src)?.[0] ?? ''
    expect(call).toContain('JSON.stringify({ tier })')
    expect(call).not.toMatch(/amount|currency|reference|email|user_id/)
  })
  it('the route reads only "tier" from the body', () => {
    const src = read('app/api/checkout/route.ts')
    expect(src).toMatch(/body\?\.tier/)
    expect(src).not.toMatch(/body\??\.(amount|currency|reference|email|user)/)
  })
  it('the modal only follows a Paystack checkout URL, and shows an error with the support address if checkout cannot start', () => {
    const src = read('components/UpgradeModal.tsx')
    expect(src).toMatch(/startsWith\('https:\/\/checkout\.paystack\.com\/'\)/)
    expect(src).toMatch(/e-mail \$\{SUPPORT_EMAIL\}/)
    expect(src).toMatch(/role="alert"/)
  })
})

describe('the return page', () => {
  it('first paints the "confirming" state (no flash of success or failure)', () => {
    const t = text(createElement(ReturnClient))
    expect(t).toContain('Confirming your payment')
    expect(t).not.toMatch(/Payment received|not completed|could not find/i)
  })
  it('is not indexed', () => expect(read('app/checkout/return/page.tsx')).toMatch(/index: false/))
})
