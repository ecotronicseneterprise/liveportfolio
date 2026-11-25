// Invariant: everything a person stores (up to the limits the editor and the assistant allow) is drawn on the public page by the three free
// designs, in every arrangement. This is the guard that would have caught the 800-character cut, the first-bullet-only index table and the
// missing testimonials on the index arrangement. Text is made of plain letters so HTML escaping cannot hide a miss.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Look from '../components/blocks/Look'
import { PROJECT_TEXT_MAX, TESTIMONIAL_TEXT_MAX } from '../lib/blocks/adapt'
import { ARRANGEMENTS, defaultLayout } from '../lib/blocks/settings'
import { FREE_TEMPLATES } from '../lib/plans'

/** A string of exactly `n` characters, made of words, that starts and ends with a unique marker so a cut anywhere is detected. */
const words = (tag: string, n: number): string => {
  const body = Array.from({ length: Math.ceil(n / 6) }, (_, i) => `w${tag}${i}`.padEnd(5, 'x')).join(' ')
  const end = `END${tag}`
  return `${body.slice(0, Math.max(0, n - end.length - 1))} ${end}`.slice(0, n)
}

const P = 12, B = 12, ST = 12, T = 10
const content = {
  name: 'Ada Lovelace', role: 'Engineer', headline: 'Builds things', location: 'Lagos', email: 'ada@example.com',
  about: [words('abouta', 300), words('aboutb', 300), words('aboutc', 300)].join('\n\n'),
  skills: ['Go', 'SQL'],
  projects: Array.from({ length: P }, (_, i) => ({
    title: `Project${i}`, problem: words(`prob${i}`, PROJECT_TEXT_MAX), solution: words(`sol${i}`, PROJECT_TEXT_MAX), outcome: words(`out${i}`, PROJECT_TEXT_MAX),
    stack: Array.from({ length: ST }, (_, k) => `Stack${i}x${k}`),
  })),
  experience: Array.from({ length: 4 }, (_, i) => ({
    company: `Company${i}`, role: `Role${i}`, period: '2020 - 2022', bullets: Array.from({ length: B }, (_, k) => words(`b${i}x${k}`, 400)),
  })),
  education: [{ degree: 'BSc', institution: 'Uni', year: '2018', period: '2014 - 2018', grade: 'First' }],
  certifications: Array.from({ length: 12 }, (_, i) => `Cert${i}`),
  testimonials: Array.from({ length: T }, (_, i) => ({ text: words(`q${i}`, TESTIMONIAL_TEXT_MAX), author: `Author${i}`, role: 'CTO', company: 'Acme' })),
}

const render = (template: string, arrangement: (typeof ARRANGEMENTS)[number]) =>
  renderToStaticMarkup(createElement(Look, { template, content, layout: defaultLayout(arrangement), page: true, idPrefix: 'x' } as never))

describe('free designs draw everything the person stored', () => {
  for (const template of FREE_TEMPLATES) {
    for (const arrangement of ARRANGEMENTS) {
      it(`${template} / ${arrangement}`, () => {
        const html = render(template, arrangement)
        const missing: string[] = []
        const need = (label: string, s: string) => { if (!html.includes(s)) missing.push(label) }
        // every character of every project text field: the last word (a unique end marker) must be present, so a cut at any length fails
        // (the fields a given arrangement leaves out on purpose are checked below)
        for (let i = 0; i < P; i++) {
          need(`project ${i} stack`, `Stack${i}x${ST - 1}`)
          need(`project ${i} text`, `ENDsol${i}`)
        }
        for (let i = 0; i < 4; i++) for (let k = 0; k < B; k++) need(`role ${i} bullet ${k}`, `ENDb${i}x${k}`)
        for (let i = 0; i < T; i++) { need(`testimonial ${i} text`, `ENDq${i}`); need(`testimonial ${i} author`, `Author${i}`) }
        for (const tag of ['abouta', 'aboutb', 'aboutc']) need(`about ${tag}`, `END${tag}`)
        need('education period', '2014 - 2018')
        for (let i = 0; i < 12; i++) need(`certification ${i}`, `Cert${i}`)
        expect(missing, missing.join(', ')).toEqual([])
        // nothing is cut with an ellipsis added by code
        expect(html).not.toMatch(/…<\/(p|li)>/)
      })
    }
  }

  it('phone fold: every folded item sits inside a fold with a labelled control that points at its checkbox; nothing is hidden by CSS outside the phone query', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../components/blocks/blocks.css'), 'utf8')
    // the only rule that hides a folded item is inside the 640px screen query
    const hidingRules = css.split('\n').filter((l) => /\.fold-x/.test(l) && /display:\s*none/.test(l))
    expect(hidingRules.length).toBeGreaterThan(0)
    const phoneBlock = css.slice(css.indexOf('@media screen and (max-width: 640px)'))
    for (const r of hidingRules) expect(phoneBlock, r).toContain(r.trim())
    for (const template of FREE_TEMPLATES) {
      for (const arrangement of ARRANGEMENTS) {
        const html = render(template, arrangement)
        const labelFor = [...html.matchAll(/<label for="([^"]+)" class="fold-btn">/g)].map((m) => m[1])
        const boxes = [...html.matchAll(/<input type="checkbox" id="([^"]+)" class="fold-t"\/>/g)].map((m) => m[1])
        expect(boxes.length, `${template}/${arrangement} has folds`).toBeGreaterThan(0)
        expect(labelFor.sort(), `${template}/${arrangement} every checkbox has its label`).toEqual(boxes.sort())
        expect(new Set(boxes).size, 'ids are unique').toBe(boxes.length)
        // counts: 12 bullets keep 3 (9 folded) per role, 10 testimonials keep 3 (7 folded), 12 stack chips keep 5 (7 folded)
        expect(html).toContain('Show 9 more')
        expect(html).toContain('+7 more')
        expect(html).toContain('Show 7 more')
      }
    }
  })

  it('short lists get no fold at all', () => {
    const small = { ...content, experience: [{ company: 'A', role: 'B', period: '2020', bullets: ['one', 'two', 'three'] }], testimonials: [{ text: 'x', author: 'y' }], projects: [{ title: 'P', problem: '', solution: 'S', outcome: 'O', stack: ['a', 'b', 'c', 'd', 'e'] }], about: 'one' }
    const html = renderToStaticMarkup(createElement(Look, { template: 'minimal', content: small, layout: defaultLayout('profile'), page: true, idPrefix: 'x' } as never))
    expect(html).not.toContain('fold-t')
    expect(html).not.toContain('fold-x')
  })

  it('problem, solution and outcome are all drawn in full where the arrangement shows them (proof, rows, index, grid)', () => {
    for (const template of FREE_TEMPLATES) {
      for (const arrangement of ARRANGEMENTS) {
        const html = render(template, arrangement)
        for (let i = 0; i < P; i++) {
          expect(html, `${template}/${arrangement} project ${i} outcome`).toContain(`ENDout${i}`)
          expect(html, `${template}/${arrangement} project ${i} problem`).toContain(`ENDprob${i}`)
        }
      }
    }
  })
})
