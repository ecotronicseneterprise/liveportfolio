// The free-user split dashboard pieces and the billing panel's cancel / upgrade states (rendered to markup; no browser).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FreeSplit from '../components/dashboard/FreeSplit'
import { stepTemplate } from '../components/dashboard/FreePreview'
import { PlanBillingView, type Billing } from '../components/dashboard/PlanBillingPanel'
import { ALL_TEMPLATES } from '../lib/plans'

const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')
const noop = () => {}

describe('design row stepping', () => {
  it('moves to the next and previous design and wraps round', () => {
    expect(stepTemplate(ALL_TEMPLATES[0], 1)).toBe(ALL_TEMPLATES[1])
    expect(stepTemplate(ALL_TEMPLATES[0], -1)).toBe(ALL_TEMPLATES[ALL_TEMPLATES.length - 1])
    expect(stepTemplate(ALL_TEMPLATES[ALL_TEMPLATES.length - 1], 1)).toBe(ALL_TEMPLATES[0])
    expect(stepTemplate('not-a-template', 1)).toBe(ALL_TEMPLATES[1])
  })
})

describe('FreeSplit', () => {
  it('paid accounts get the form alone', () => {
    const t = text(createElement(FreeSplit, { enabled: false, preview: createElement('p', null, 'PREVIEW'), children: createElement('p', null, 'FORM') }))
    expect(t.trim()).toBe('FORM')
  })
  it('Pro can suppress the extra mobile Preview tab without removing the desktop preview', () => {
    const html = renderToStaticMarkup(createElement(FreeSplit, { enabled: true, mobilePreview: false, preview: createElement('p', null, 'PREVIEW'), children: createElement('p', null, 'FORM') }))
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain('role="tabpanel"')
    expect(html).toContain('id="fs-panel-edit" class="block"')
    expect(html).toContain('id="fs-panel-preview" class="hidden lg:block')
    expect(html).toContain('PREVIEW')
    expect(html).toContain('lg:grid')
  })
  it('free accounts get Edit and Preview tabs and both panels', () => {
    const html = renderToStaticMarkup(createElement(FreeSplit, { enabled: true, preview: createElement('p', null, 'PREVIEW'), children: createElement('p', null, 'FORM') }))
    expect(html).toContain('role="tablist"')
    expect(html).toContain('FORM'); expect(html).toContain('PREVIEW')
    expect(html).toContain('lg:grid')
  })
})

describe('billing panel: cancel, refunds closed, upgrade', () => {
  const paid = (extra: Partial<Billing>): Billing => ({
    plan: 'basic', expires_at: '2027-10-05T10:00:00.000Z', days_left: 300, one_time: true,
    payments: [{ date: '2026-10-22T10:00:00.000Z', plan: 'basic', amount_kobo: 1_500_000, refunded: false }], ...extra,
  })
  it.each(['free', 'basic', 'pro'] as const)('omits the generic email-refund notice for %s accounts without refund details', (plan) => {
    const t = text(createElement(PlanBillingView, { b: paid({ plan, refund: undefined }), onPay: noop }))
    expect(t).not.toContain('7-day refund guarantee. To ask for a refund')
    expect(t).not.toContain('within 7 days of paying.')
    expect(t).toContain('Plan and billing')
  })
  it('inside 7 days: the deadline, the latest-payment note and a Cancel and refund button', () => {
    const t = text(createElement(PlanBillingView, { b: paid({ refund: { eligible: true, deadline: '2026-10-29T10:00:00.000Z', tier: 'basic', amount_kobo: 1_500_000, one_time: true } }), onPay: noop, onRefund: async () => 'requested' as const }))
    expect(t).toContain('Request a refund'); expect(t).toContain('29 October 2026'); expect(t).toMatch(/latest payment only/)
  })
  it('after 7 days: no cancel button, plain wording with the end date', () => {
    const t = text(createElement(PlanBillingView, { b: paid({ refund: { eligible: false, deadline: '2026-10-01T10:00:00.000Z', tier: 'basic', amount_kobo: 1_500_000, one_time: true } }), onPay: noop, onRefund: async () => 'requested' as const }))
    expect(t).not.toContain('Request a refund')
    expect(t).toContain('Refunds are available for 7 days after payment. Your plan stays active until 5 October 2027. It does not renew automatically.')
  })
  it('a Basic owner gets an Upgrade to Pro button that opens the normal checkout; Pro owners do not', () => {
    expect(text(createElement(PlanBillingView, { b: paid({}), onPay: noop }))).toContain('Upgrade to Pro')
    expect(text(createElement(PlanBillingView, { b: paid({ plan: 'pro' }), onPay: noop }))).not.toContain('Upgrade to Pro')
  })
})
