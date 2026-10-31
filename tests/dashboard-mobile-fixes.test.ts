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
  it('shows one big preview, the design name, arrows and a card for every design, with no Use this design button', () => {
    const html = render('developer', 'minimal')
    expect(html).toContain('Swipe the preview to look around')
    expect(html).toContain('Previous design')
    expect(html).toContain('Next design')
    expect(html.match(/<li /g)).toHaveLength(ALL_TEMPLATES.length)
    expect(html).toContain('4 of 10')
    expect(html).toContain('>Pro<') // the previewed design is a Pro one
    expect(html).not.toContain('Use this design')
    expect(html).not.toContain('This is your design')
    expect(html).not.toContain('Yours')
  })
  it('the current design has a green tick on its card, and only that card', () => {
    const html = render('developer', 'minimal')
    expect(html.split('bg-[#1D9E75]')).toHaveLength(2) // exactly one tick
    expect(html).toContain('your current design')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  })
  it('says Previewing only when the preview is not the saved design, and Your current design when it is', () => {
    expect(render('developer', 'minimal')).toContain('Previewing only. Tap its card below to use it.')
    const same = render('minimal', 'minimal')
    expect(same).toContain('Your current design')
    expect(same).not.toContain('Previewing only')
  })
  it('swiping and the arrows only preview; tapping a card is what saves', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toContain('onPreview={(id: TemplateId) => setPreviewTemplate(id)}')
    expect(page).toContain('onUse={(id: TemplateId) => { setTemplate(id); setPreviewTemplate(id); setLockedTemplateMsg(null); saveAfterPick.current = true }}')
    const src = read('../components/dashboard/TemplateCarousel.tsx')
    expect(src).toContain('onPreview(stepTemplate(id, dx < 0 ? 1 : -1))') // the swipe
    expect(src.slice(src.indexOf('onPointerUp'), src.indexOf('onPointerCancel'))).not.toContain('onUse') // a swipe never saves
    expect(src).toContain('onClick={() => onUse(tid)}') // a card tap does
  })
  it('the second preview with the Previous/New design buttons is hidden on a phone for Pro, and kept on desktop and for other plans', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toMatch(/<div className=\{isPro \? 'hidden lg:block' : undefined\}>\s*<ProDesignPicker/)
  })
  it('Pro mobile uses only the carousel: no second Preview tab or look-customiser preview and Pro buttons', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toMatch(/<FreeSplit\s+enabled\s+mobilePreview=\{!isPro\}/)
    expect(page).toMatch(/storedLayout\(editContent as StoredContent, template\) \? \(\s*<div className=\{isPro \? 'hidden lg:block' : undefined\}>\s*<LookPicker/)
  })
  it('the three looks list is hidden on a phone for Pro (the swipe preview already has them) and kept on desktop', () => {
    expect(read('../components/dashboard/LookPicker.tsx')).toContain("hideLooksOnPhone ? 'hidden lg:block' : undefined")
    expect(read('../app/dashboard/page.tsx')).toContain('hideLooksOnPhone={isPro}')
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
