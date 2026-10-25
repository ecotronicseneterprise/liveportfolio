import type { Metadata } from 'next'
import Link from 'next/link'
import Look from '@/components/blocks/Look'
import { ARRANGEMENT_SECTIONS, TEMPLATE_BY_THEME, THEMES, isLookTemplate, kindFromRole, rank } from '@/lib/blocks/presets'
import { ARRANGEMENTS, defaultLayout, type Arrangement } from '@/lib/blocks/settings'
import { LONG_STRINGS, ONE_PROJECT_NO_FIGURES, SAMPLE_PEOPLE, SPARSE, type SampleKind } from '@/lib/blocks/sample'

// Internal review page for the block renderer. It renders only INVENTED content (lib/blocks/sample.ts), is not linked from anywhere, is not
// indexed, and has no data of any real person. Add ?p=engineer&t=creative&a=proof to draw one portfolio full page.
export const metadata: Metadata = { title: 'Design review', robots: { index: false, follow: false } }

const FIXTURES = { ...SAMPLE_PEOPLE, sparse: SPARSE, long: LONG_STRINGS, noimg: ONE_PROJECT_NO_FIGURES } as const
type FixtureKey = keyof typeof FIXTURES

export default async function DesignReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const one = (k: string) => (Array.isArray(q[k]) ? q[k]![0] : (q[k] as string | undefined))
  const p = one('p') as FixtureKey | undefined
  const tpl = one('t')
  const arr = one('a') as Arrangement | undefined

  if (p && p in FIXTURES && tpl && isLookTemplate(tpl)) {
    const content = FIXTURES[p]
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
        </section>
      ))}
      <p style={{ marginTop: 28, fontSize: 14 }}>Sections per arrangement: {ARRANGEMENTS.map((a) => `${a} = ${ARRANGEMENT_SECTIONS[a].map((s) => s.block).join(', ')}`).join('; ')}.</p>
    </main>
  )
}
