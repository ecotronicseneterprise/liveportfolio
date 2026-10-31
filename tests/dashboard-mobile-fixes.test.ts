// Mobile dashboard fixes: the tech-stack field can take a new item, the notification menu closes on an outside tap and stays on screen,
// Pro gets a swipeable preview of every design, and long names shrink instead of breaking mid-word.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import { parseStack } from '../components/dashboard/StackInput'
import TemplateCarousel from '../components/dashboard/TemplateCarousel'
import { ALL_TEMPLATES, PRO_TEMPLATES } from '../lib/plans'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n')

describe('tech stack field', () => {
  it('a trailing comma is kept while typing, so the next item can be added', () => {
    expect(parseStack('React,')).toEqual(['React'])
    expect(parseStack('React, ')).toEqual(['React'])
    expect(parseStack('React, Node.js')).toEqual(['React', 'Node.js'])
    expect(parseStack(' a ,, b ,\n c ')).toEqual(['a', 'b', 'c'])
    expect(parseStack('')).toEqual([])
  })
  it('the dashboard and the onboarding review use the field that keeps what is typed', () => {
    expect(read('../app/dashboard/page.tsx')).toContain('<StackInput')
    expect(read('../app/dashboard/page.tsx')).not.toContain("value={(proj.stack || []).join(', ')}")
    expect(read('../components/onboarding/ReviewStep.tsx')).toContain('<StackInput')
    const field = read('../components/dashboard/StackInput.tsx')
    expect(field).toContain('value={text}') // the visible text is the raw text, not the re-joined list
    expect(field).toContain('onBlur')
  })
})

describe('notification menu', () => {
  const page = read('../app/dashboard/page.tsx')
  it('closes on a tap anywhere else and on Escape', () => {
    expect(page).toContain("document.addEventListener('pointerdown', away)")
    expect(page).toContain("e.key === 'Escape'")
  })
  it('sits inside the screen on a phone and drops under the bell from the sm breakpoint', () => {
    expect(page).toContain('fixed inset-x-3 top-16')
    expect(page).toContain('sm:absolute sm:inset-x-auto sm:right-0')
    expect(page).toContain('max-h-[70vh] overflow-y-auto')
  })
})

describe('Pro design picker on a phone', () => {
  const render = (previewId: string, savedId: string) => renderToStaticMarkup(createElement(TemplateCarousel, { content: SAMPLE_PEOPLE.engineer as never, previewId, savedId, onPreview: () => {}, onUse: () => {} }))
  it('shows one big preview, the design name, a tile for every design and a Use this design button', () => {
    const html = render('developer', 'minimal')
    expect(html).toContain('Swipe the preview to compare designs')
    expect(html).toContain('Use this design')
    expect(html).toContain('Previous design')
    expect(html).toContain('Next design')
    expect(html.match(/<li /g)).toHaveLength(ALL_TEMPLATES.length)
    expect(html).toContain('4 of 10')
    expect(html).toContain('>Pro<') // the previewed design is a Pro one
    expect(html).toContain('Yours') // the saved design is marked
  })
  it('a design that is already yours says so and cannot be re-applied', () => {
    const html = render('minimal', 'minimal')
    expect(html).toContain('This is your design')
    expect(html).toContain('disabled=""')
    expect(render('developer', 'minimal')).not.toContain('This is your design')
  })
  it('comparing only previews: swiping or tapping calls onPreview, and only Use this design saves', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toContain('onPreview={(id: TemplateId) => setPreviewTemplate(id)}')
    expect(page).toContain('onUse={(id: TemplateId) => { setTemplate(id); setPreviewTemplate(id); setLockedTemplateMsg(null); saveAfterPick.current = true }}')
    const src = read('../components/dashboard/TemplateCarousel.tsx')
    expect(src).toContain('onPreview(stepTemplate(id, dx < 0 ? 1 : -1))') // the swipe
    expect(src.slice(src.indexOf('onPointerUp'), src.indexOf('onPointerCancel'))).not.toContain('onUse') // a swipe never saves
  })
  it('is shown to Pro accounts on a phone and tablet only, and the old small-button row is hidden for them there', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toMatch(/\{isPro && \(\s*<div className="lg:hidden">\s*<TemplateCarousel/)
    expect(page).toContain("<div className={isPro ? 'hidden lg:block' : undefined}>")
  })
})

describe('long names', () => {
  it('the name is sized from its longest word, so it shrinks instead of breaking mid-word', () => {
    const css = read('../components/blocks/blocks.css')
    expect(css).toContain('min(var(--h1), calc(85cqw / var(--nl, 8)))')
    expect(css).toContain('min(46px, calc(120cqw / var(--nl, 8)))')
    const tsx = read('../components/blocks/blocks.tsx')
    expect(tsx).toContain('nameFit')
    expect(tsx.match(/style=\{nameFit\(d\.name\)\}/g)).toHaveLength(3)
  })
})
