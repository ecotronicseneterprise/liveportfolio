// Fixes from real use: the hero range of a Pro design matches the numbered sections it draws.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProDesign from '../components/templates/pro/ProDesign'
import { PRO_TEMPLATES } from '../lib/plans'
import { proContent as fixture } from './fixtures/pro-content'

describe('Pro design hero range', () => {
  for (const template of PRO_TEMPLATES) {
    it(`${template}: "01 — NN" equals the number of numbered sections`, () => {
      const content = { ...fixture, testimonials: [] } // no testimonials: one section fewer
      const html = renderToStaticMarkup(createElement(ProDesign, { content: content as never, template }))
      const numbered = [...html.matchAll(/<span class="pro-index" aria-hidden="true">(\d\d)<\/span>/g)].map((m) => m[1])
      expect(numbered.length).toBeGreaterThan(0)
      const range = html.match(/01 — (\d\d)/)?.[1]
      expect(range).toBe(numbered[numbered.length - 1])
      expect(Number(range)).toBe(numbered.length)
    })
  }
})