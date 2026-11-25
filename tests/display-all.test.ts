// Invariant: everything a person stores (up to the limits the editor and the assistant allow) is drawn on the public page by the three free
// designs, in every arrangement. This is the guard that would have caught the 800-character cut, the first-bullet-only index table and the
// missing testimonials on the index arrangement. Text is made of plain letters so HTML escaping cannot hide a miss.
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
