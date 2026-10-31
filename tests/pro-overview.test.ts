// The Pro "My Portfolio" panel renders its first state (loading numbers, checklist and next action from the content) without sample data.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
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

  const insight = { score: 70, summary: 'Solid start.', scored_at: '2026-10-20T10:00:00Z', cached: true }
  const withInsight = (contentUpdatedAt: string | null) => renderToStaticMarkup(createElement(ProOverview, { ...base, content: {} as never, insight, contentUpdatedAt }))
  it('says when the portfolio changed after the weekly review, and only then', () => {
    expect(withInsight('2026-10-25T10:00:00Z')).toContain('changed your portfolio since this review')
    expect(withInsight('2026-10-20T10:00:30Z')).not.toContain('changed your portfolio since this review') // within a minute of the review: no
    expect(withInsight('2026-10-01T10:00:00Z')).not.toContain('changed your portfolio since this review')
    expect(withInsight(null)).not.toContain('changed your portfolio since this review')
  })

  const source = fs.readFileSync(path.resolve(__dirname, '../components/dashboard/ProOverview.tsx'), 'utf8')
  it('opens on the last 30 days', () => {
    expect(html).toContain('<option value="30" selected="">Last 30 days</option>')
    expect(html).toContain('last 30 days')
  })
  it('the chart bars answer arrow keys, Home and End, as the hint says', () => {
    expect(source).toContain('onKeyDown={moveBar}')
    for (const k of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) expect(source).toContain(`'${k}'`)
  })
  it('an analytics failure hides only the traffic cards, never the next action, quality or review', () => {
    expect(source).toContain('{!down && <div className="grid grid-cols-1')
    expect(source).toContain('{!down && <section className={card} aria-label="Audience activity">')
    expect(source).toContain('{!down && <section className={card} aria-label="Where attention comes from">')
    expect(source).not.toMatch(/{!down && <section className={card} aria-label="(Your next best action|Portfolio quality)"/)
  })
})
