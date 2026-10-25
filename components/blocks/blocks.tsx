// The ten blocks and their variants. Plain functions of (data, options): no hooks, no client JS, safe to render on the server and inside
// client trees (gallery thumbnails, the dashboard preview). A block whose data is empty returns null: a portfolio never shows an empty
// heading. All words that are not the person's own come from messages/en.json (t('portfolio.*')); nothing here is hard-coded English.
import ContactIcons from '@/components/contact/ContactIcons'
import type { ReactNode } from 'react'
import { t } from '@/lib/onboarding/t'
import type { BlockData, BlockProject } from '@/lib/blocks/adapt'
import type { SectionSpec } from '@/lib/blocks/presets'

export interface BlockCtx {
  /** Prefix for anchor ids, so several portfolios on one page (the landing specimens, the gallery) never share an id. */
  idp: string
  /** Show only the first paragraph of the About text. */
  bioShort: boolean
  /** At most this many projects. */
  projectLimit: number
}

// Display only: pick the figures out of a sentence the person wrote. A figure needs its unit (%, x, hours, days, ... or the naira sign):
// a bare number is never picked out, and a digit inside a word ("p95") is ignored. Nothing is parsed into a statistic.
const FIGURE = /(₦\s?\d[\d,]*(?:\.\d+)?\s?[KMB]?|(?<![A-Za-z\d.,\-])\d(?:[\d,]*\d)?(?:\.\d+)?\s?(?:%|x|hours?|minutes?|days?|weeks?|months?|years?|seconds?))/i
export function Figures({ text }: { text: string }): ReactNode {
  return text.split(FIGURE).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}

const id = (c: BlockCtx, name: string) => `${c.idp}-${name}`
const mailto = (e: string) => `mailto:${e}`

function ProjectLinks({ p }: { p: BlockProject }) {
  if (!p.url && !p.sourceUrl) return null
  return (
    <p className="plinks">
      {p.url && <a href={p.url} rel="noopener noreferrer">{t('portfolio.visitProject')}<span className="sr-only"> {p.title}</span></a>}
      {p.sourceUrl && <a href={p.sourceUrl} rel="noopener noreferrer">{t('portfolio.sourceCode')}<span className="sr-only"> {p.title}</span></a>}
    </p>
  )
}

function ProjectStack({ p }: { p: BlockProject }) {
  return p.stack.length ? (
    <ul className="pstack" aria-label={t('portfolio.projectStack')}>
      {p.stack.slice(0, 5).map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
    </ul>
  ) : null
}

/** User-uploaded project media wins. Without it, render an abstract title/stack graphic, never a fake screenshot. */
function Picture({ p }: { p: BlockProject }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (p.imageUrl) return <img className="pimg" src={p.imageUrl} alt={p.title} width={1280} height={800} loading="lazy" decoding="async" />
  const monogram = p.title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return (
    <div className="pvisual" aria-hidden="true">
      <span className="pvisual-mark">{monogram}</span>
      <span className="pvisual-lines"><i /><i /><i /></span>
    </div>
  )
}

function HeroPortrait({ d }: { d: BlockData }) {
  if (d.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="photo" src={d.avatarUrl} alt={t('portfolio.photoOf', { name: d.name })} width={208} height={208} decoding="async" fetchPriority="high" />
  }
  return null
}

type Render = (d: BlockData, c: BlockCtx) => ReactNode

// ── hero ─────────────────────────────────────────────────────────────────────────────────────────────────
const hero: Record<string, Render> = {
  statement: (d, c) => (
    <section className="b b-hero b-hero--statement" id={id(c, 'top')}>
      <div className="wrap">
        <div className="hero-intro">
          <div className="hero-copy">
            <h1 className="name">{d.name}</h1>
            {d.role && <p className="role">{d.role}</p>}
            {d.location && <p className="hero-place">{d.location}</p>}
            {d.headline && <p className="headline">{d.headline}</p>}
          </div>
          <HeroPortrait d={d} />
        </div>
      </div>
    </section>
  ),
  split: (d, c) => (
    <section className="b b-hero b-hero--split" id={id(c, 'top')}>
      <div className="wrap">
        <div className="split-id">
          <HeroPortrait d={d} />
          <div className="split-text">
            <h1 className="name">{d.name}</h1>
            {d.role && <p className="role">{d.role}</p>}
            {d.headline && <p className="headline">{d.headline}</p>}
          </div>
        </div>
        {d.location && (
          <dl className="facts">
            <div><dt>{t('portfolio.based')}</dt><dd>{d.location}</dd></div>
          </dl>
        )}
      </div>
    </section>
  ),
  compact: (d, c) => (
    <section className="b b-hero b-hero--compact" id={id(c, 'top')}>
      <div className="wrap">
        <div className="row">
          <h1 className="name">{d.name}</h1>
          {(d.role || d.location) && <p className="role">{[d.role, d.location].filter(Boolean).join(' · ')}</p>}
        </div>
        {d.headline && <p className="headline">{d.headline}</p>}
      </div>
    </section>
  ),
}

// ── about ────────────────────────────────────────────────────────────────────────────────────────────────
const paras = (d: BlockData, c: BlockCtx) => (c.bioShort ? d.about.slice(0, 1) : d.about)
const about: Record<string, Render> = {
  prose: (d, c) => d.about.length ? (
    <section className="b b-about b-anchor" id={id(c, 'about')}><div className="wrap"><h2>{t('portfolio.about')}</h2><div className="prose">{paras(d, c).map((p, i) => <p key={i}>{p}</p>)}</div></div></section>
  ) : null,
  columns: (d, c) => d.about.length ? (
    <section className="b b-about b-anchor" id={id(c, 'about')}><div className="wrap two"><h2>{t('portfolio.about')}</h2><div className="prose">{paras(d, c).map((p, i) => <p key={i}>{p}</p>)}</div></div></section>
  ) : null,
  short: (d, c) => d.about.length ? (
    <section className="b b-about b-anchor" id={id(c, 'about')}><div className="wrap"><h2>{t('portfolio.about')}</h2><div className="prose"><p>{d.about[0]}</p></div></div></section>
  ) : null,
}

// ── projects ─────────────────────────────────────────────────────────────────────────────────────────────
const list = (d: BlockData, c: BlockCtx) => d.projects.slice(0, c.projectLimit)
const projects: Record<string, Render> = {
  index: (d, c) => d.projects.length ? (
    <section className="b b-projects b-anchor" id={id(c, 'work')}>
      <div className="wrap">
        <h2>{t('portfolio.work')}</h2>
        {list(d, c).map((p, i) => (
          <article className="prow" key={i}>
            <span className="yr" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="main"><h3>{p.title}</h3>{p.problem && <p>{p.problem}</p>}{p.solution && <p className="project-solution">{p.solution}</p>}<ProjectStack p={p} /><ProjectLinks p={p} /></div>
              <div className="project-result"><Picture p={p} />{p.outcome && <p className="res"><Figures text={p.outcome} /></p>}</div>
          </article>
        ))}
      </div>
    </section>
  ) : null,
  grid: (d, c) => d.projects.length ? (
    <section className="b b-projects b-anchor" id={id(c, 'work')}>
      <div className="wrap">
        <h2>{t('portfolio.work')}</h2>
        <div className="pgrid">
          {list(d, c).map((p, i) => (
            <article className="pitem" key={i}>
              <Picture p={p} />
              <h3>{p.title}</h3>
              {(p.outcome || p.solution) && <p className="res">{p.outcome || p.solution}</p>}
              {p.problem && <p className="sub">{p.problem}</p>}
              <ProjectStack p={p} />
              <ProjectLinks p={p} />
            </article>
          ))}
        </div>
      </div>
    </section>
  ) : null,
  proof: (d, c) => d.projects.length ? (
    <section className="b b-projects b-anchor" id={id(c, 'work')}>
      <div className="wrap">
        <h2>{t('portfolio.results')}</h2>
        <div className="pproof">
          {list(d, c).map((p, i) => (
            <article key={i}>
              <Picture p={p} />
              <p className="big">{p.outcome ? <Figures text={p.outcome} /> : p.solution || p.problem}</p>
              <h3>{p.title}</h3>
              {(p.problem || p.solution) && <p className="sub">{[p.problem, p.solution].filter(Boolean).join(' ')}</p>}
              <ProjectStack p={p} />
              <ProjectLinks p={p} />
            </article>
          ))}
        </div>
      </div>
    </section>
  ) : null,
  rows: (d, c) => d.projects.length ? (
    <section className="b b-projects b-anchor" id={id(c, 'work')}>
      <div className="wrap">
        <h2>{t('portfolio.work')}</h2>
        {list(d, c).map((p, i) => (
          <article className="case" key={i}>
            <h3>{p.title}</h3>
            <dl>
              {p.problem && <div><dt>{t('portfolio.situation')}</dt><dd>{p.problem}</dd></div>}
              {p.solution && <div><dt>{t('portfolio.didWhat')}</dt><dd>{p.solution}</dd></div>}
              {p.outcome && <div><dt>{t('portfolio.result')}</dt><dd className="res"><Figures text={p.outcome} /></dd></div>}
            </dl>
            <ProjectStack p={p} />
            <Picture p={p} />
            <ProjectLinks p={p} />
          </article>
        ))}
      </div>
    </section>
  ) : null,
}

// ── experience ───────────────────────────────────────────────────────────────────────────────────────────
const experience: Record<string, Render> = {
  timeline: (d, c) => d.experience.length ? (
    <section className="b b-exp b-anchor" id={id(c, 'experience')}>
      <div className="wrap">
        <h2>{t('portfolio.experience')}</h2>
        {d.experience.map((e, i) => (
          <article className="job" key={i}>
            <p className="when">{e.period}</p>
            <div>
              <h3>{e.role || e.company}</h3>
              {e.role && e.company && <p className="org">{e.company}</p>}
              {e.bullets.length > 0 && <ul>{e.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}
            </div>
          </article>
        ))}
      </div>
    </section>
  ) : null,
  table: (d, c) => d.experience.length ? (
    <section className="b b-exp b-anchor" id={id(c, 'experience')}>
      <div className="wrap">
        <h2>{t('portfolio.experience')}</h2>
        {d.experience.map((e, i) => (
          <article className="trow" key={i}>
            <p className="when">{e.period}</p>
            <h3>{e.role || e.company}</h3>
            <p className="org">{e.role ? e.company : ''}</p>
            <p className="what">{e.bullets[0] ?? ''}</p>
          </article>
        ))}
      </div>
    </section>
  ) : null,
}

// ── skills, credentials ──────────────────────────────────────────────────────────────────────────────────
const skills: Record<string, Render> = {
  groups: (d, c) => d.skillGroups.length ? (
    <section className="b b-skills b-anchor" id={id(c, 'skills')}>
      <div className="wrap"><h2>{t('portfolio.skills')}</h2><div className="sgrid">{d.skillGroups.map((g, i) => <div key={i}><h3>{g.category}</h3><p>{g.items.join(', ')}</p></div>)}</div></div>
    </section>
  ) : null,
  inline: (d, c) => d.skillGroups.length ? (
    <section className="b b-skills b-anchor" id={id(c, 'skills')}>
      <div className="wrap"><h2>{t('portfolio.skills')}</h2><p className="sline">{d.skillGroups.map((g, i) => <span key={i}><strong>{g.category}.</strong> {g.items.join(', ')}. </span>)}</p></div>
    </section>
  ) : null,
}

const credentials: Record<string, Render> = {
  list: (d, c) => (d.education.length || d.certifications.length) ? (
    <section className="b b-cred b-anchor" id={id(c, 'credentials')}>
      <div className="wrap">
        <h2>{t('portfolio.credentials')}</h2>
        <div className="two2">
          {d.education.length > 0 && <ul>{d.education.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          {d.certifications.length > 0 && <ul>{d.certifications.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      </div>
    </section>
  ) : null,
  inline: (d, c) => (d.education.length || d.certifications.length) ? (
    <section className="b b-cred b-anchor" id={id(c, 'credentials')}>
      <div className="wrap"><h2>{t('portfolio.credentials')}</h2><p className="sline">{[...d.education, ...d.certifications].join('. ')}.</p></div>
    </section>
  ) : null,
}

// ── quote ────────────────────────────────────────────────────────────────────────────────────────────────
const quoteBlock = (variant: 'pull' | 'band'): Render => (d) => d.quote ? (
  <section className={`b b-quote b-quote--${variant}`}>
    <div className="wrap">
      <figure>
        <blockquote><p>“{d.quote.text}”</p></blockquote>
        <figcaption>{[d.quote.author, d.quote.role].filter(Boolean).join(', ')}</figcaption>
      </figure>
    </div>
  </section>
) : null
const quote: Record<string, Render> = { pull: quoteBlock('pull'), band: quoteBlock('band') }

// ── social links ─────────────────────────────────────────────────────────────────────────────────────────
const social: Record<string, Render> = { inline: () => null, stacked: () => null } // GitHub, LinkedIn and the rest are icons in the contact section

// ── contact (never hidden when there is something to reach the person with) ─────────────────────────────
const contact: Record<string, Render> = {
  band: (d, c) => d.contact.length ? (
    <section className="b b-contact b-contact--band b-anchor" id={id(c, 'contact')}>
      <div className="wrap">
        <h2>{t('portfolio.getInTouch')}</h2>
        <ContactIcons items={d.contact} label={t('portfolio.contact')} />
      </div>
    </section>
  ) : null,
  plain: (d, c) => d.contact.length ? (
    <section className="b b-contact b-contact--plain b-anchor" id={id(c, 'contact')}>
      <div className="wrap two">
        <h2>{t('portfolio.contact')}</h2>
        <div><ContactIcons items={d.contact} label={t('portfolio.contact')} /></div>
      </div>
    </section>
  ) : null,
}

const REGISTRY: Record<string, Record<string, Render>> = {
  hero, about, projects, experience, skills, credentials, quote, 'social-links': social, contact,
}

/** One section. An unknown block or variant renders nothing (a layout is validated before it gets here). */
export function renderSection(spec: SectionSpec, d: BlockData, c: BlockCtx): ReactNode {
  return REGISTRY[spec.block]?.[spec.variant]?.(d, c) ?? null
}

/** Which of the page's anchors will actually exist (drives the top navigation). */
export function presentAnchors(d: BlockData): Array<'work' | 'experience' | 'contact'> {
  const out: Array<'work' | 'experience' | 'contact'> = []
  if (d.projects.length) out.push('work')
  if (d.experience.length) out.push('experience')
  if (d.contact.length) out.push('contact')
  return out
}
