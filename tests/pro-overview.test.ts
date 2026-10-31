// The Pro "My Portfolio" panel renders its first state (loading numbers, checklist and next action from the content) without sample data.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProOverview from '../components/dashboard/ProOverview'

const base = { portfolioId: 'p1', userId: 'u1', token: 't', slug: 'ada', portfolioUrl: 'https://liveportfolio.site/ada', onEdit: () => {}, insight: null, insightLoading: false }

describe('ProOverview', () => {
  const html = renderToStaticMarkup(createElement(ProOverview, { ...base, content: { name: 'Ada', role: 'Engineer', projects: [{ title: 'X', problem: 'p', solution: 's', outcome: '', stack: [] }] } as never }))
  it('answers the three questions: attention, what works, what next', () => {
    for (const t of ['Attention', 'Audience activity', 'Where attention comes from', 'Your next best action', 'Portfolio quality', 'Weekly portfolio review', 'Recent activity']) expect(html).toContain(t)
    expect(html).toContain('Link clicks')
    expect(html).toContain('Make it easy to contact you') // the highest-priority gap (no email) becomes the one action
  })
  it('shows no fabricated numbers while loading and no "Live" badge', () => {
    expect(html).toContain('Loading…')
    expect(html).not.toMatch(/>Live</)
    expect(html).toContain('not a prediction of hiring success')
  })
})
