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

describe('Pro design carousel', () => {
  const html = renderToStaticMarkup(createElement(TemplateCarousel, { content: SAMPLE_PEOPLE.engineer as never, currentId: 'developer', onPick: () => {} }))
  it('has a card for every design, with the Pro ones marked and the current one selected', () => {
    expect(html.match(/<li /g)).toHaveLength(ALL_TEMPLATES.length)
    expect(html.match(/>Pro</g)!.length).toBe(PRO_TEMPLATES.length)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Swipe to browse')
    expect(html).toContain('snap-x')
  })
  it('is shown to Pro accounts on a phone only, and the small-button row is hidden for them there', () => {
    const page = read('../app/dashboard/page.tsx')
    expect(page).toContain('{isPro && (\n              <div className="lg:hidden">\n                <TemplateCarousel')
    expect(page.replace(/\r\n/g, '\n')).toContain("<div className={isPro ? 'hidden lg:block' : undefined}>")
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
