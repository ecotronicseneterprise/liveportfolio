// The Awards section of the older (non-block) designs. One small component so every design draws awards the same way and takes its own
// section and heading classes, so it looks native in each. Nothing is drawn when there are no awards. Links are http(s) only (render-safe).
import type { PortfolioAward } from './Minimal'

const clean = (awards: PortfolioAward[] | undefined) => (Array.isArray(awards) ? awards : []).filter((a) => a && typeof a.title === 'string' && a.title.trim() && typeof a.issuer === 'string' && a.issuer.trim())

export function awardLine(a: PortfolioAward): string {
  return [a.title.trim(), a.issuer.trim()].join(', ') + (a.year && a.year.trim() ? ` (${a.year.trim()})` : '')
}

export default function AwardsSection({ awards, sectionClass, headingClass, label = 'Awards', headingPrefix = '' }: { awards: PortfolioAward[] | undefined; sectionClass?: string; headingClass?: string; label?: string; headingPrefix?: string }) {
  const list = clean(awards)
  if (!list.length) return null
  return (
    <section id="awards" className={sectionClass}>
      <h2 className={headingClass}>{headingPrefix}{label}</h2>
      <ul style={{ margin: 0, paddingLeft: 20, listStyle: 'disc outside', lineHeight: 1.6 }}>
        {list.map((a, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <strong>{a.title.trim()}</strong>, {a.issuer.trim()}{a.year && a.year.trim() ? ` (${a.year.trim()})` : ''}
            {a.description && a.description.trim() ? <span style={{ display: 'block', opacity: 0.85 }}>{a.description.trim()}</span> : null}
            {a.url ? <> <a href={a.url} rel="noopener noreferrer" target="_blank">Link<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> to {a.title.trim()}</span></a></> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}