// The dashboard look picker: what it offers, that every control is a choice from a fixed list, and that it is accessible.
import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import LookPicker from '../components/dashboard/LookPicker'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'
import { ACCENT_IDS, ARRANGEMENTS } from '../lib/blocks/settings'
import { t } from '../lib/onboarding/t'

const content = { ...SAMPLE_PEOPLE.engineer, layout: { v: 1, arrangement: 'proof' } } as never
const render = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(LookPicker, { content, template: 'creative', isPro: false, onChange: () => {}, onLocked: () => {}, ...over } as never))
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')

describe('LookPicker', () => {
  const html = render()
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0])

  it("offers the three looks, every layout, the six colours plus the look's own, three spacings and two About lengths", () => {
    for (const l of ['studio', 'journal', 'ledger']) expect(html).toContain(t(`portfolio.look.${l}`))
    for (const a of ARRANGEMENTS) expect(html).toContain(t(`portfolio.arrangement.${a}`))
    for (const id of ACCENT_IDS) expect(html).toContain(t(`lookPicker.accents.${id}`))
    for (const d of ['compact', 'comfortable', 'airy']) expect(html).toContain(t(`lookPicker.densities.${d}`))
    for (const b of ['long', 'short']) expect(html).toContain(t(`lookPicker.bios.${b}`))
    expect(text(html)).toContain(t('lookPicker.accentDefault'))
  })
  it('marks the selected look and the current choices with aria-pressed', () => {
    expect(buttons.filter((b) => b.includes('aria-pressed="true"')).length).toBeGreaterThanOrEqual(5) // look, layout, default accent, spacing, bio
    expect(text(html)).toContain(t('lookPicker.selected'))
  })
  it('every control is a real button at least 44px tall, grouped in fieldsets with legends', () => {
    expect(buttons.length).toBeGreaterThan(20)
    for (const b of buttons) expect(b, b).toMatch(/min-h-\[44px\]/)
    const fieldsets = (html.match(/<fieldset/g) ?? []).length
    expect(fieldsets).toBeGreaterThanOrEqual(5)
    expect((html.match(/<legend/g) ?? []).length).toBe(fieldsets)
  })
  it('the seven classic Pro templates are listed; a free account sees them as Pro with an explanatory label, a Pro account does not', () => {
    for (const name of ['Developer', 'Designer', 'Data scientist', 'Product manager', 'Finance', 'Graduate', 'Cybersecurity']) expect(html).toContain(name)
    expect(html).toMatch(/aria-label="Developer, Developer is included with Pro\."/)
    expect(render({ isPro: true })).not.toMatch(/included with Pro\./)
  })
  it('identifies the Pro version and hides irrelevant free-look controls', () => {
    const original = render({ template: 'developer', isPro: true, content: { ...SAMPLE_PEOPLE.engineer, pro_designs: { developer: 1 } } })
    expect(text(original)).toContain(t('lookPicker.classicActive', { name: 'Developer' }))
    expect(original).toContain('hidden=""')
    const redesigned = render({ template: 'developer', isPro: true }) // no marker: the redesign is the default
    expect(text(redesigned)).toContain(t('lookPicker.redesignActive', { name: 'Developer' }))
    expect(text(html)).not.toContain('You are using the original')
  })
  it('offers a reset to the recommended look, and a live preview of the whole portfolio', () => {
    expect(text(html)).toContain(t('lookPicker.recommended'))
    expect(html).toContain(t('lookPicker.livePreview'))
  })
  it('contains no hard-coded words: every visible string comes from messages/en.json', () => {
    const src = fs.readFileSync('components/dashboard/LookPicker.tsx', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const literal = [...src.matchAll(/>([^<>{}\n]*[A-Za-z]{3,}[^<>{}\n]*)<\/[a-zA-Z]/g)].map((m) => m[1].trim())
    expect(literal).toEqual([])
    for (const m of src.matchAll(/t\(['`](lookPicker\.[a-zA-Z.]+|portfolio\.[a-zA-Z.]+)['`]/g)) expect(t(m[1]), m[1]).not.toBe(m[1])
  })
  it('uses only choices from fixed lists (no colour input, no text input, no free CSS)', () => {
    expect(fs.readFileSync('components/dashboard/LookPicker.tsx', 'utf8')).not.toMatch(/type="color"|type="text"|<input|<textarea|dangerouslySetInnerHTML/)
  })
  it('the dashboard shows it for portfolios that have or can derive a valid layout; the classic switcher still exists as the fallback block', () => {
    const src = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
    expect(src).toMatch(/storedLayout\(editContent as StoredContent, template\) \? \(/)
    expect(src).toMatch(/<LookPicker/)
    expect(src).toMatch(/Template<\/label>/) // the classic block is still there for legacy portfolios
  })
})
