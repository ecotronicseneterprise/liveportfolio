import type { Metadata } from 'next'
import Link from 'next/link'
import Look from '@/components/blocks/Look'
import Developer from '@/components/templates/Developer'
import Designer from '@/components/templates/Designer'
import DataScientist from '@/components/templates/DataScientist'
import ProductManager from '@/components/templates/ProductManager'
import Finance from '@/components/templates/Finance'
import Graduate from '@/components/templates/Graduate'
import Cybersecurity from '@/components/templates/Cybersecurity'
import type { PortfolioContent } from '@/components/templates/Minimal'
import ProDesign from '@/components/templates/pro/ProDesign'
import ProDesignLab from '@/components/templates/pro/ProDesignLab'
import { PRO_SAMPLES } from '@/lib/portfolio/pro-samples'
import { isProTemplateId, withProDesign } from '@/lib/portfolio/presentation'
import { portfolioRenderMode } from '@/lib/portfolio/render-mode'
import { safeContent } from '@/lib/portfolio/render-safe'
import { PRO_TEMPLATES } from '@/lib/plans'
import { ARRANGEMENT_SECTIONS, TEMPLATE_BY_THEME, THEMES, isLookTemplate, kindFromRole, rank } from '@/lib/blocks/presets'
import { ARRANGEMENTS, defaultLayout, type Arrangement } from '@/lib/blocks/settings'
import { LONG_STRINGS, ONE_PROJECT_NO_FIGURES, SAMPLE_PEOPLE, SPARSE, type SampleKind } from '@/lib/blocks/sample'

// Internal review page for the block renderer. It renders only INVENTED content (lib/blocks/sample.ts), is not linked from anywhere, is not
// indexed, and has no data of any real person. Add ?p=engineer&t=creative&a=proof to draw one portfolio full page.
export const metadata: Metadata = { title: 'Design review', robots: { index: false, follow: false } }

const FIXTURES: Record<string, PortfolioContent> = { ...SAMPLE_PEOPLE, sparse: SPARSE, long: LONG_STRINGS, noimg: ONE_PROJECT_NO_FIGURES, ...PRO_SAMPLES }
type FixtureKey = keyof typeof FIXTURES

// ?c=1 adds a phone number and social links to the invented person, to look at the contact icons of every template.
const CONTACT_DEMO = {
  phone: '+234 801 234 5678', whatsapp: '2348012345678', linkedin_url: 'https://www.linkedin.com/in/example-person', github_url: 'https://github.com/example-person',
  website_url: 'https://example.com', twitter_url: 'https://x.com/example_person', instagram_url: 'https://www.instagram.com/example.person',
  facebook_url: 'https://www.facebook.com/example.person', youtube_url: 'https://www.youtube.com/@example', tiktok_url: 'https://www.tiktok.com/@example',
}

// The seven Pro templates keep their own components; ?t=developer etc. draws them from the same invented content (so every template can be looked at).
const PRO: Record<string, React.ComponentType<{ content: PortfolioContent }>> = {
  developer: Developer, designer: Designer, 'data-scientist': DataScientist, 'product-manager': ProductManager, finance: Finance, graduate: Graduate, cybersecurity: Cybersecurity,
}

export default async function DesignReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const one = (k: string) => (Array.isArray(q[k]) ? q[k]![0] : (q[k] as string | undefined))
  const p = one('p') as FixtureKey | undefined
  const tpl = one('t')
  const arr = one('a') as Arrangement | undefined

  if (p && Object.hasOwn(FIXTURES, p) && isProTemplateId(tpl)) {
    const content = withProDesign(safeContent({ ...(FIXTURES[p] as unknown as Record<string, unknown>), ...(one('c') ? CONTACT_DEMO : {}) }) as unknown as PortfolioContent, tpl, one('v') === '2')
    if (one('client') === '1' || one('picker') === '1') return <ProDesignLab content={content} template={tpl} picker={one('picker') === '1'} />
    const mode = portfolioRenderMode(content, tpl)
    if (mode.kind === 'pro') return <ProDesign content={content} template={mode.template} />
    const Pro = PRO[tpl]
    return <Pro content={content} />
  }

  if (p && p in FIXTURES && tpl && isLookTemplate(tpl)) {
    const content = one('c') ? ({ ...FIXTURES[p], ...CONTACT_DEMO } as typeof FIXTURES[typeof p]) : FIXTURES[p]
    const layout = defaultLayout(arr && (ARRANGEMENTS as readonly string[]).includes(arr) ? arr : rank(content)[0].arrangement)
    return <Look template={tpl} content={content} layout={layout} page idPrefix="r" />
  }

  const people = Object.keys(FIXTURES) as FixtureKey[]
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <h1>Design review</h1>
      <p>Invented content only. Each link draws one portfolio full page.</p>
      {people.map((k) => (
        <section key={k} style={{ marginTop: 28 }}>
          <h2 style={{ marginBottom: 4 }}>{k} <small style={{ fontWeight: 400 }}>(kind: {kindFromRole(FIXTURES[k].role)}; default look: {rank(FIXTURES[k])[0].theme} / {rank(FIXTURES[k])[0].arrangement})</small></h2>
          <ul style={{ columns: 3, paddingLeft: 18 }}>
            {THEMES.flatMap((th) => ARRANGEMENTS.map((a) => (
              <li key={`${th}-${a}`}><Link href={`/design-review?p=${k}&t=${TEMPLATE_BY_THEME[th]}&a=${a}`}>{th} · {a}</Link></li>
            )))}
          </ul>
          <ul className="mt-4" style={{ columns: 2, paddingLeft: 18 }}>
            {PRO_TEMPLATES.map((id) => <li key={id}>{id}: <Link href={`/design-review?p=${k}&t=${id}`}>Original</Link> · <Link href={`/design-review?p=${k}&t=${id}&v=2`}>Redesigned</Link> · <Link href={`/design-review?p=${k}&t=${id}&picker=1`}>Compare</Link></li>)}
          </ul>
        </section>
      ))}
      <p style={{ marginTop: 28, fontSize: 14 }}>Sections per arrangement: {ARRANGEMENTS.map((a) => `${a} = ${ARRANGEMENT_SECTIONS[a].map((s) => s.block).join(', ')}`).join('; ')}.</p>
    </main>
  )
}
