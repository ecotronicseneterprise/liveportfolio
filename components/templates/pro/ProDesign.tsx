import type { ReactNode } from 'react'
import ContactIcons from '@/components/contact/ContactIcons'
import { contactItems } from '@/lib/contact/items'
import type { PortfolioContent } from '../Minimal'
import type { ProTemplateId } from '@/lib/portfolio/presentation'
import { completeSkillGroups, proContent } from '@/lib/portfolio/pro-content'
import { Picture, PortfolioNav } from './ProInteractions'
import '../template-fonts.css'
import './pro-designs.css'

const DESIGN: Record<ProTemplateId, { label: string; work: string; intro: string; order: SectionName[] }> = {
  developer: { label: 'Engineering field notes', work: 'Selected builds', intro: 'The person behind the work', order: ['projects', 'about', 'experience', 'skills', 'credentials', 'references'] },
  designer: { label: 'Independent perspectives', work: 'Selected work', intro: 'A little context', order: ['projects', 'about', 'experience', 'skills', 'references', 'credentials'] },
  'data-scientist': { label: 'Research & practice', work: 'Project notebook', intro: 'Research interests & background', order: ['about', 'projects', 'skills', 'experience', 'credentials', 'references'] },
  'product-manager': { label: 'Ideas into practice', work: 'Decisions & outcomes', intro: 'My perspective', order: ['projects', 'about', 'experience', 'skills', 'references', 'credentials'] },
  finance: { label: 'Professional profile', work: 'Selected engagements', intro: 'Professional overview', order: ['about', 'projects', 'experience', 'credentials', 'skills', 'references'] },
  graduate: { label: 'A body of work, in progress', work: 'Things I have made', intro: 'My story so far', order: ['about', 'projects', 'credentials', 'experience', 'skills', 'references'] },
  cybersecurity: { label: 'Evidence / practice / perspective', work: 'Case reports', intro: 'Professional statement', order: ['projects', 'about', 'credentials', 'skills', 'experience', 'references'] },
}
type SectionName = 'projects' | 'about' | 'experience' | 'skills' | 'credentials' | 'references'
const ordinal = (i: number) => String(i + 1).padStart(2, '0')

function External({ href, children }: { href?: string; children: ReactNode }) {
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span><span className="pro-sr"> (opens in a new tab)</span></a> : null
}

function Links({ c }: { c: PortfolioContent }) {
  return <div className="pro-links"><ContactIcons content={c as unknown as Record<string, unknown>} /></div>
}

function Section({ id, number, title, children, className = '' }: { id: string; number: number; title: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`pro-section ${className}`} aria-labelledby={`${id}-heading`}>
    <header className="pro-section-heading"><span className="pro-index" aria-hidden="true">{ordinal(number)}</span><h2 id={`${id}-heading`}>{title}</h2></header>
    <div className="pro-section-body">{children}</div>
  </section>
}

function Projects({ c, template }: { c: PortfolioContent; template: ProTemplateId }) {
  const labels = template === 'data-scientist' ? ['Question', 'Method', 'Result'] : template === 'product-manager' ? ['Problem', 'Approach', 'Outcome'] : ['Context', 'Work', 'Outcome']
  return <div className="pro-projects">{c.projects.map((p, i) => <article className="pro-project" key={i}>
    <div className="pro-project-top"><span className="pro-eyebrow">{template === 'cybersecurity' ? 'REPORT' : template === 'data-scientist' ? 'ENTRY' : 'PROJECT'} / {ordinal(i)}</span>
      <div className="pro-project-links"><External href={p.url}>View project</External><External href={p.github_url}>Repository</External></div>
    </div>
    <Picture src={p.image_url} alt={p.title ? `${p.title} — project image` : 'Project image'} />
    {p.title && <h3>{p.title}</h3>}
    <dl className="pro-project-story">{[p.problem, p.solution, p.outcome].map((value, j) => value ? <div className={j === 2 ? 'pro-outcome' : ''} key={j}><dt>{labels[j]}</dt><dd>{value}</dd></div> : null)}</dl>
    {!!p.stack.length && <ul className="pro-tags" aria-label="Project skills and tools">{p.stack.map((s, j) => <li key={j}>{s}</li>)}</ul>}
  </article>)}</div>
}

export default function ProDesign({ content, template, idPrefix }: { content: PortfolioContent; template: ProTemplateId; idPrefix?: string }) {
  const c = proContent(content)
  const design = DESIGN[template]
  const prefix = idPrefix || `pro-${template}`
  const id = (section: string) => `${prefix}-${section}`
  const groups = completeSkillGroups(c)
  const hasContact = contactItems(c as unknown as Record<string, unknown>).length > 0
  const has = { about: !!c.about, projects: !!c.projects.length, experience: !!c.experience.length, skills: !!(groups.length || c.skills_narrative),
    credentials: !!(c.education?.length || c.certifications?.length), references: !!c.testimonials?.length }
  const sections = design.order.filter((s) => has[s])
  const nav = [has.projects && ['projects', 'Work'], has.experience && ['experience', 'Experience'], hasContact && ['contact', 'Contact']].filter((x): x is string[] => !!x)

  const body: Record<SectionName, ReactNode> = {
    projects: <Projects c={c} template={template} />,
    about: <div className="pro-prose">{c.about.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</div>,
    skills: <><p className="pro-prose">{c.skills_narrative}</p><div className="pro-skill-groups">{groups.map((g, i) => <div key={i}><h3>{g.category}</h3><ul className="pro-tags">{g.items.map((s, j) => <li key={j}>{s}</li>)}</ul></div>)}</div></>,
    experience: <ol className="pro-timeline">{c.experience.map((e, i) => <li key={i}><div className="pro-period">{e.period}</div><div>{e.role && <h3>{e.role}</h3>}<p className="pro-company">{e.company}</p>{!!e.bullets.length && <ul className="pro-bullets">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}</div></li>)}</ol>,
    credentials: <div className="pro-credentials">
      {!!c.education?.length && <div><h3 className="pro-eyebrow">Education</h3><ul>{c.education.map((e, i) => <li key={i}><h4>{e.degree}</h4><p>{e.institution}</p><p className="pro-period">{[e.year, e.period !== e.year ? e.period : '', e.grade].filter(Boolean).join(' · ')}</p></li>)}</ul></div>}
      {!!c.certifications?.length && <div><h3 className="pro-eyebrow">Certifications</h3><ul>{c.certifications.map((cert, i) => <li key={i}>{cert}</li>)}</ul></div>}
    </div>,
    references: <div className="pro-quotes">{c.testimonials?.map((q, i) => <figure key={i}><blockquote>{q.text}</blockquote><figcaption><strong>{q.author}</strong><span>{[q.role, q.company].filter(Boolean).join(' · ')}</span></figcaption></figure>)}</div>,
  }
  const titles: Record<SectionName, string> = { projects: design.work, about: design.intro, experience: 'Experience', skills: 'Skills & practice', credentials: 'Education & credentials', references: 'In their words' }

  return <div className={`pro-page pro-${template}`} data-pro-template={template} data-design-version="2">
    <a className="pro-skip" href={`#${id('main')}`}>Skip to portfolio</a>
    <PortfolioNav prefix={prefix} label={design.label} mark={template === 'developer' ? '</>' : template === 'cybersecurity' ? '[+]' : template === 'designer' ? '✳' : '↗'} links={nav.map(([key, label]) => ({ href: `#${id(key)}`, label }))} />
    <main id={id('main')} className="pro-main" tabIndex={-1}>
      <div className="pro-hero">
        <div className="pro-hero-copy"><p className="pro-eyebrow">{c.role}</p><h1>{c.name}</h1>{c.headline && <p className="pro-headline">{c.headline}</p>}
          <div className="pro-hero-meta">{c.location && <span>{c.location}</span>}{has.projects && <a href={`#${id('projects')}`}>Explore the work <span aria-hidden="true">↓</span></a>}</div>
          {!has.projects && hasContact && <Links c={c} />}
        </div>
        <Picture src={c.avatar_url} alt={`Portrait of ${c.name}`} portrait />
        <div className="pro-hero-rule" aria-hidden="true"><span>{design.label}</span><span>01 — {String(sections.length + 1).padStart(2, '0')}</span></div>
      </div>
      <div className="pro-content">{sections.map((s, index) => <Section key={s} id={id(s)} number={index} title={titles[s]} className={`pro-section-${s}`}>{body[s]}</Section>)}</div>
      {hasContact && <section className="pro-contact" id={id('contact')} aria-labelledby={id('contact-heading')}><p className="pro-eyebrow">Continue the conversation</p><h2 id={id('contact-heading')}>Let’s connect.</h2><Links c={c} /></section>}
    </main>
    <footer className="pro-footer"><span>{c.role || 'Portfolio'}</span><a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">Made with LivePortfolio<span className="pro-sr"> (opens in a new tab)</span></a></footer>
  </div>
}