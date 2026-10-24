// The wording customers read must match the checkout that is live, and the browser must never choose a price.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import TermsPage from '../app/terms/page'
import PricingSection from '../components/PricingSection'
import ReturnClient from '../app/checkout/return/ReturnClient'
import { GET as configGET } from '../app/api/checkout/config/route'
import { billingCopy } from '../lib/billing/copy'

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

afterEach(() => { delete process.env.CHECKOUT_V2 })

describe('Terms of Service follow the live checkout', () => {
  it('both modes: a real 7-day refund guarantee, issued through Paystack, ending the plan', () => {
    for (const mode of [undefined, 'on']) {
      if (mode) process.env.CHECKOUT_V2 = mode; else delete process.env.CHECKOUT_V2
      const t = text(createElement(TermsPage))
      expect(t).toMatch(/7-day guarantee/i)
      expect(t).toMatch(/within 7 days of your purchase/i)
      expect(t).toMatch(/refund the full amount you paid, whether or not you have published/i)
      expect(t).toMatch(/paid plan ends and your portfolio is unpublished/i)
      expect(t).not.toMatch(/at our discretion|may not apply/i) // the old, weaker wording is gone
    }
  })
  it('one-time mode: one payment for 12 months, no automatic renewal, nothing to cancel', () => {
    process.env.CHECKOUT_V2 = 'on'
    const t = text(createElement(TermsPage))
    expect(t).toMatch(/single payment that gives you 12 months/i)
    expect(t).toMatch(/no automatic renewal/i)
    expect(t).not.toMatch(/renew automatically unless cancelled|may cancel your subscription/i)
  })
  it('default mode keeps the subscription wording, because that is how checkout behaves until the flag is on', () => {
    delete process.env.CHECKOUT_V2
    const t = text(createElement(TermsPage))
    expect(t).toMatch(/renew automatically unless cancelled/i)
    expect(t).toMatch(/cancel your subscription at any time/i)
  })
  it('owner-only mode is not "on for everyone": the public copy stays the subscription wording', () => {
    process.env.CHECKOUT_V2 = 'owner'
    expect(text(createElement(TermsPage))).toMatch(/renew automatically unless cancelled/i)
  })
})

describe('the pricing line and landing copy', () => {
  it('PricingSection shows the matching note and the 7-day guarantee in both modes', () => {
    expect(text(createElement(PricingSection, { oneTime: true }))).toContain(billingCopy(true).pricingNote)
    expect(text(createElement(PricingSection))).toContain(billingCopy(false).pricingNote)
    expect(text(createElement(PricingSection))).not.toMatch(/Refunds reviewed within 7 days/)
  })
  it('the old over-promising lines are not hard-coded anywhere any more', () => {
    const files = [...walk('app'), ...walk('components')].filter((f) => !f.startsWith('app/terms'))
    const offenders = files.filter((f) => /7-day refund if you publish and change your mind|Refunds reviewed within 7 days of purchase|plans can be cancelled anytime\. See the pricing page/.test(read(f)))
    expect(offenders).toEqual([])
    expect(read('components/UpgradeModal.tsx')).not.toMatch(/Annual billing · 7-day refund guarantee · Cancel anytime/)
    expect(read('components/UpgradeModal.tsx')).toMatch(/billingCopy\(oneTime\)\.modalFooter/)
  })
})

describe('GET /api/checkout/config', () => {
  it('says one-time only when the flag is on for everyone, and reveals nothing else', async () => {
    for (const [mode, expected] of [[undefined, false], ['off', false], ['owner', false], ['on', true]] as const) {
      if (mode) process.env.CHECKOUT_V2 = mode; else delete process.env.CHECKOUT_V2
      expect(await (await configGET()).json()).toEqual({ oneTime: expected })
    }
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
  it('the modal only follows a Paystack checkout URL', () => {
    expect(read('components/UpgradeModal.tsx')).toMatch(/startsWith\('https:\/\/checkout\.paystack\.com\/'\)/)
  })
})

describe('the return page', () => {
  it('first paints the "confirming" state (no flash of success or failure)', () => {
    const t = text(createElement(ReturnClient))
    expect(t).toContain('Confirming your payment')
    expect(t).not.toMatch(/Payment received|not completed|could not find/i)
  })
  it('is not indexed', () => {
    expect(read('app/checkout/return/page.tsx')).toMatch(/index: false/)
  })
})
