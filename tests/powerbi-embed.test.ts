// The optional interactive Power BI dashboard on a project: accepted only from Power BI "Publish to web", never anything else,
// shown under the project picture on the free designs, and invisible (no change at all) for projects without one.
import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { powerBiEmbedUrl } from '@/lib/connectors/safe-url'
import { applyOps, OpError } from '@/lib/portfolio/ops'
import { approvalReason } from '@/lib/mcp/edit-helpers'
import { displayWarnings } from '@/lib/mcp/diff'
import { toolByName } from '@/lib/mcp/tools'
import Look from '../components/blocks/Look'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'

const R = 'eyJrIjoiMTIzNDU2Nzg5MDEyMzQ1Njc4OTAiLCJ0IjoiYWJjZGVmIn0='
const GOOD = `https://app.powerbi.com/view?r=${R}`
const IFRAME = `<iframe title="Sales" width="600" height="373.5" src="${GOOD}&amp;pageName=ReportSection" frameborder="0" allowFullScreen="true"></iframe>`
const PICTURE = 'https://proj.supabase.co/storage/v1/object/public/project-images/a.jpg'

describe('powerBiEmbedUrl: Power BI only, exact host and path', () => {
  it('accepts the Publish-to-web link and the full embed code, and returns a clean address', () => {
    expect(powerBiEmbedUrl(GOOD)).toBe(GOOD)
    expect(powerBiEmbedUrl(IFRAME)).toBe(`${GOOD}&pageName=ReportSection`)
    expect(powerBiEmbedUrl(`  ${GOOD}  `)).toBe(GOOD)
  })
  it.each([
    ['another site', 'https://evil.example/view?r=' + R],
    ['look-alike host', 'https://app.powerbi.com.evil.example/view?r=' + R],
    ['subdomain trick', 'https://evil.example/app.powerbi.com/view?r=' + R],
    ['http', `http://app.powerbi.com/view?r=${R}`],
    ['credentials', `https://user:pw@app.powerbi.com/view?r=${R}`],
    ['other port', `https://app.powerbi.com:8443/view?r=${R}`],
    ['other path', `https://app.powerbi.com/groups/me/reports/1?r=${R}`],
    ['no token', 'https://app.powerbi.com/view'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<script>1</script>'],
    ['Tableau (not supported)', 'https://public.tableau.com/views/x/y?:embed=y'],
    ['empty', ''],
    ['not a string', 42],
    ['huge', 'https://app.powerbi.com/view?r=' + 'a'.repeat(3000)],
    ['iframe pointing elsewhere', '<iframe src="https://evil.example/x"></iframe>'],
  ])('refuses %s', (_n, v) => expect(powerBiEmbedUrl(v as never)).toBe(''))
})

describe('operations', () => {
  const state = { content: { name: 'Ada', projects: [{ title: 'Sales', problem: '', solution: '', outcome: '', stack: [] }] }, template: 'minimal' }
  it('add_project and update_project take a valid embed (normalised) and refuse an invalid one', () => {
    const added = applyOps(state, [{ op: 'add_project', project: { title: 'Dash', embed_url: IFRAME } }])
    expect((added.state.content.projects as Array<{ embed_url: string }>)[1].embed_url).toBe(`${GOOD}&pageName=ReportSection`)
    const upd = applyOps(state, [{ op: 'update_project', index: 0, patch: { embed_url: GOOD } }])
    expect((upd.state.content.projects as Array<{ embed_url: string }>)[0].embed_url).toBe(GOOD)
    expect(() => applyOps(state, [{ op: 'update_project', index: 0, patch: { embed_url: 'https://evil.example/x' } }])).toThrow(OpError)
    expect(() => applyOps(state, [{ op: 'add_project', project: { title: 'X', embed_url: 'javascript:alert(1)' } }])).toThrow(OpError)
  })
  it('an empty value removes it', () => {
    const withEmbed = applyOps(state, [{ op: 'update_project', index: 0, patch: { embed_url: GOOD } }]).state
    const cleared = applyOps(withEmbed, [{ op: 'update_project', index: 0, patch: { embed_url: '' } }]).state
    expect((cleared.content.projects as Array<Record<string, unknown>>)[0].embed_url).toBeUndefined()
  })
  it('the dashboard whole-section save (replace_content) validates and normalises it too', () => {
    const ok = applyOps(state, [{ op: 'replace_content', content: { projects: [{ title: 'Sales', embed_url: IFRAME }] } }])
    expect((ok.state.content.projects as Array<{ embed_url: string }>)[0].embed_url).toBe(`${GOOD}&pageName=ReportSection`)
    expect(() => applyOps(state, [{ op: 'replace_content', content: { projects: [{ title: 'Sales', embed_url: 'https://evil.example/x' }] } }])).toThrow(OpError)
    const blank = applyOps(state, [{ op: 'replace_content', content: { projects: [{ title: 'Sales', embed_url: '' }] } }])
    expect((blank.state.content.projects as Array<Record<string, unknown>>)[0].embed_url).toBeUndefined()
  })
})

describe('the assistant', () => {
  it('has the field on add and update, and a new embed waits for the person (it is a link on a public page)', () => {
    expect(Object.keys(toolByName('portfolio_add_project')!.input.shape)).toContain('embed_url')
    const patch = toolByName('portfolio_update_project')!.input.shape.patch as unknown as { shape: Record<string, unknown> }
    expect(Object.keys(patch.shape)).toContain('embed_url')
    const before = { projects: [{ title: 'Sales' }] }
    expect(approvalReason(before, 'minimal', [{ op: 'update_project', index: 0, patch: { embed_url: GOOD } }])).toMatch(/link/)
  })
  it('warns when the design is a Pro design (it shows the picture only)', () => {
    const c = { projects: [{ title: 'Sales', embed_url: GOOD }] }
    expect(displayWarnings(c, 'developer').join(' ')).toMatch(/Pro design shows the picture only/)
    expect(displayWarnings(c, 'minimal').join(' ')).not.toMatch(/Pro design/)
  })
})

describe('public page', () => {
  const base = SAMPLE_PEOPLE.engineer as unknown as Record<string, unknown>
  const render = (projects: unknown, arrangement = 'proof') => renderToStaticMarkup(createElement(Look, { template: 'minimal', content: { ...base, projects } as never, layout: { v: 1, arrangement } as never, page: true }))
  const project = (extra: object = {}) => [{ title: 'Sales Dashboard', problem: 'p', solution: 's', outcome: 'o', stack: ['Power BI'], ...extra }]
  it('shows a closed, lazy, sandboxed Power BI iframe under the picture, with a full-screen link', () => {
    const html = ['proof', 'profile', 'index', 'showcase'].map((a) => render(project({ embed_url: GOOD, image_url: PICTURE }), a)).find((h) => h.includes('pembed')) ?? ''
    expect(html).toContain('<details class="pembed">')
    expect(html).toContain(`src="${GOOD.replace(/&/g, '&amp;')}"`)
    expect(html).toMatch(/loading="lazy"/)
    expect(html).toMatch(/sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"/)
    expect(html).toContain('Try the live dashboard')
    expect(html).toContain('Open full screen')
    expect(html).not.toMatch(/<details class="pembed" open/)
  })
  it('works without a picture too, and ignores an invalid address stored in the data', () => {
    expect(['proof', 'profile', 'index', 'showcase'].some((a) => render(project({ embed_url: GOOD }), a).includes('pembed'))).toBe(true)
    const bad = render(project({ embed_url: 'https://evil.example/x', image_url: PICTURE }))
    expect(bad).not.toContain('<iframe')
    expect(bad).not.toContain('evil.example')
  })
  it('a portfolio without any embed renders exactly as it did before (no iframe, no details, no new markup)', () => {
    for (const a of ['proof', 'profile', 'index', 'showcase']) {
      const html = render(project(), a)
      expect(html).not.toContain('<iframe')
      expect(html).not.toContain('pembed')
      expect(html).not.toContain('Try the live dashboard')
    }
  })
})

describe('dashboard editor', () => {
  it('has a separate Power BI field with the hint, distinct from the Live URL', () => {
    const src = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
    expect(src).toContain('Interactive Power BI dashboard (optional)')
    expect(src).toContain('Publish to web')
    expect(src).toContain('This is not the Live URL above')
    expect(src).toContain('editor-project-${i}-embed')
  })
})
