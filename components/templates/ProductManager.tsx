'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  .pm-root {
    --bg: #FFFBEB;
    --surface: #FFFFFF;
    --primary: #B45309;
    --accent: #FBBF24;
    --text: #1C1917;
    --muted: #78716C;
    --border: #FDE68A;
    background: var(--bg);
    color: var(--text);
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    min-height: 100vh;
  }
  .pm-nav {
    background: rgba(255,251,235,0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    padding: 14px 7vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .pm-nav-name {
    font-size: 15px; font-weight: 800;
    color: var(--primary);
  }
  .pm-nav-links { display: flex; gap: 24px; }
  .pm-nav-link {
    font-size: 13px; color: var(--muted);
    text-decoration: none; font-weight: 500;
    transition: color 0.2s;
  }
  .pm-nav-link:hover { color: var(--primary); }

  /* Hero */
  .pm-hero {
    padding: 64px 7vw 48px;
    border-bottom: 1px solid var(--border);
  }
  .pm-hero-inner {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 40px; align-items: start;
    margin-bottom: 40px;
  }
  .pm-hero-name {
    font-size: clamp(36px, 5vw, 60px);
    font-weight: 800; line-height: 1.0;
    letter-spacing: -0.02em;
    color: var(--text); margin-bottom: 10px;
  }
  .pm-hero-role {
    font-size: 18px; font-weight: 600;
    color: var(--primary); margin-bottom: 12px;
  }
  .pm-hero-headline {
    font-size: 16px; color: var(--muted);
    line-height: 1.7; max-width: 520px;
    margin-bottom: 20px; font-weight: 400;
  }
  .pm-hero-links { display: flex; gap: 10px; flex-wrap: wrap; }
  .pm-cta-primary {
    padding: 10px 22px;
    background: var(--primary); color: white;
    border-radius: 8px; font-size: 14px;
    font-weight: 600; text-decoration: none;
    transition: background 0.2s;
  }
  .pm-cta-primary:hover { background: #92400E; }
  .pm-cta-ghost {
    padding: 9px 20px;
    border: 1.5px solid var(--border); color: var(--primary);
    border-radius: 8px; font-size: 14px;
    font-weight: 500; text-decoration: none;
    transition: all 0.2s;
  }
  .pm-cta-ghost:hover { border-color: var(--primary); }
  .pm-avatar {
    width: 120px; height: 120px;
    border-radius: 16px; object-fit: cover;
    border: 2px solid var(--border);
  }
  .pm-avatar-ph {
    width: 120px; height: 120px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--border), var(--accent));
    display: flex; align-items: center; justify-content: center;
    font-size: 44px;
  }

  /* Stats cards */
  .pm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .pm-stat-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 12px; padding: 20px 24px;
    text-align: center;
  }
  .pm-stat-num {
    font-size: 32px; font-weight: 800;
    color: var(--primary); line-height: 1; margin-bottom: 4px;
  }
  .pm-stat-label { font-size: 12px; color: var(--muted); font-weight: 500; }

  /* Section */
  .pm-section {
    padding: 48px 7vw;
    border-bottom: 1px solid var(--border);
    opacity: 0; transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .pm-section.visible { opacity: 1; transform: none; }
  .pm-section-eyebrow {
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--primary);
    font-weight: 700; margin-bottom: 6px;
  }
  .pm-section-title {
    font-size: 28px; font-weight: 800;
    color: var(--text); margin-bottom: 32px;
    line-height: 1.2;
  }

  /* Products shipped */
  .pm-products { display: flex; flex-direction: column; gap: 20px; }
  .pm-product-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 24px;
    transition: box-shadow 0.2s;
  }
  .pm-product-card:hover { box-shadow: 0 8px 24px rgba(180,83,9,0.08); }
  .pm-product-img { width: 100%; aspect-ratio: 16/6; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 16px; }
  .pm-product-name {
    font-size: 18px; font-weight: 700;
    color: var(--text); margin-bottom: 6px;
  }
  .pm-product-outcome {
    font-size: 14px; font-weight: 700;
    color: var(--primary);
    background: rgba(251,191,36,0.15);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 12px;
    display: inline-block; margin-bottom: 12px;
  }
  .pm-product-desc { font-size: 14px; color: var(--muted); line-height: 1.7; margin-bottom: 12px; }
  .pm-product-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .pm-product-tag {
    font-size: 11px; padding: 3px 10px;
    background: rgba(251,191,36,0.1);
    border: 1px solid var(--border);
    border-radius: 4px; color: var(--primary); font-weight: 500;
  }
  .pm-product-link {
    font-size: 13px; color: var(--primary);
    text-decoration: none; font-weight: 600;
    transition: opacity 0.2s;
  }
  .pm-product-link:hover { opacity: 0.7; }

  /* Skills */
  .pm-skills-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .pm-skill-group {}
  .pm-skill-group-title {
    font-size: 13px; font-weight: 700;
    color: var(--primary); margin-bottom: 10px;
  }
  .pm-skill-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pm-skill-pill {
    font-size: 12px; padding: 4px 12px;
    background: rgba(251,191,36,0.1);
    border: 1px solid var(--border);
    border-radius: 50px; color: var(--text);
    font-weight: 500;
  }

  /* Experience */
  .pm-exp-list { display: flex; flex-direction: column; gap: 28px; }
  .pm-exp-item { border-left: 3px solid var(--border); padding-left: 20px; position: relative; }
  .pm-exp-dot { position: absolute; left: -6px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); }
  .pm-exp-role { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .pm-exp-co { font-size: 14px; color: var(--primary); font-weight: 600; margin-bottom: 2px; }
  .pm-exp-period { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .pm-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 5px; }
  .pm-exp-bullet { font-size: 13px; color: var(--muted); line-height: 1.6; display: flex; gap: 8px; }
  .pm-bullet-mark { color: var(--accent); flex-shrink: 0; font-weight: 700; }

  /* Contact */
  .pm-contact {
    padding: 56px 7vw 64px;
    text-align: center;
    background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(180,83,9,0.04));
  }
  .pm-contact-title { font-size: 36px; font-weight: 800; color: var(--text); margin-bottom: 12px; }
  .pm-contact-sub { font-size: 16px; color: var(--muted); margin-bottom: 28px; }
  .pm-contact-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px; background: var(--primary);
    color: white; border-radius: 8px;
    font-size: 15px; font-weight: 700;
    text-decoration: none; transition: background 0.2s;
  }
  .pm-contact-cta:hover { background: #92400E; }
  .pm-footer {
    padding: 16px 7vw;
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--muted);
    border-top: 1px solid var(--border);
  }
  .pm-footer a { color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .pm-footer a:hover { color: var(--primary); }

  @media (max-width: 700px) {
    .pm-hero-inner { grid-template-columns: 1fr; }
    .pm-stats { grid-template-columns: 1fr 1fr; }
    .pm-skills-groups { grid-template-columns: 1fr; }
    .pm-nav-links { display: none; }
  }
`

const STRAT_KEYWORDS = ['strategy', 'roadmap', 'vision', 'okr', 'kpi', 'prioritization', 'planning', 'product strategy', 'go-to-market', 'gtm']
const EXEC_KEYWORDS = ['agile', 'scrum', 'jira', 'notion', 'confluence', 'sprint', 'delivery', 'execution', 'launch', 'linear', 'trello', 'asana']
const TECH_KEYWORDS = ['sql', 'python', 'analytics', 'data', 'figma', 'api', 'a/b test', 'metrics', 'funnel', 'amplitude', 'mixpanel', 'tableau', 'looker']
const SOFT_KEYWORDS = ['stakeholder', 'communication', 'leadership', 'mentoring', 'cross-functional', 'collaboration', 'negotiation', 'presentation']

function groupPMSkills(skills: string[]) {
  const groups: Record<string, string[]> = { Strategy: [], Execution: [], Technical: [], 'Leadership & Soft': [], Other: [] }
  for (const s of skills) {
    const sl = s.toLowerCase()
    if (STRAT_KEYWORDS.some((k) => sl.includes(k))) groups['Strategy'].push(s)
    else if (EXEC_KEYWORDS.some((k) => sl.includes(k))) groups['Execution'].push(s)
    else if (TECH_KEYWORDS.some((k) => sl.includes(k))) groups['Technical'].push(s)
    else if (SOFT_KEYWORDS.some((k) => sl.includes(k))) groups['Leadership & Soft'].push(s)
    else groups['Other'].push(s)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

function extractStat(text: string): string | null {
  const m = text.match(/\d[\d,kKmMbB%+x\.]*/)
  return m ? m[0] : null
}

export default function ProductManager({ content }: { content: PortfolioContent }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll('.pm-section')
    if (!sections) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible') }),
      { threshold: 0.08 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const skillGroups: [string, string[]][] = content.skills_grouped?.length > 0
    ? content.skills_grouped.filter(g => g.items?.length > 0).map(g => [g.category, g.items])
    : groupPMSkills(content.skills)

  // Build stats from project outcomes with numbers
  const statsData: { num: string; label: string }[] = []
  for (const p of content.projects) {
    if (statsData.length >= 3) break
    if (p.outcome) {
      const num = extractStat(p.outcome)
      if (num) statsData.push({ num, label: p.title })
    }
  }

  return (
    <div className="pm-root" ref={rootRef}>
      <style>{css}</style>

      <nav className="pm-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="pm-nav-links">
          <a href="#products" className="pm-nav-link">Work</a>
          <a href="#skills" className="pm-nav-link">Skills</a>
          {content.experience.length > 0 && <a href="#experience" className="pm-nav-link">Experience</a>}
          <a href="#contact" className="pm-nav-link">Contact</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="pm-hero">
        <div className="pm-hero-inner">
          <div>
            <h1 className="pm-hero-name">
              {content.name.trim().split(/\s+/).map((part, i) => (
                <span key={i} style={{ display: 'block' }}>{part}</span>
              ))}
            </h1>
            <div className="pm-hero-role">{content.role}</div>
            <div className="pm-hero-headline">{content.headline}</div>
            <div className="pm-hero-links">
              <a href={`mailto:${content.email}`} className="pm-cta-primary">Get in touch →</a>
              {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="pm-cta-ghost">LinkedIn</a>}
              {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="pm-cta-ghost">GitHub</a>}
            </div>
          </div>
          <div>
            {content.avatar_url && (
              <Image src={content.avatar_url} alt={content.name} width={120} height={120} className="pm-avatar" />
            )}
          </div>
        </div>

        {statsData.length > 0 && (
          <div className="pm-stats">
            {statsData.map((s, i) => (
              <div key={i} className="pm-stat-card">
                <div className="pm-stat-num">{s.num}</div>
                <div className="pm-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      {content.projects.length > 0 && (
        <section id="products" className="pm-section">
          <div className="pm-section-eyebrow">Portfolio</div>
          <div className="pm-section-title">Products Shipped</div>
          <div className="pm-products">
            {content.projects.map((p, i) => (
              <div key={i} className="pm-product-card">
                {p.image_url && !failedImages.has(p.image_url) && (
                  <Image src={p.image_url} alt={p.title} width={1200} height={450} className="pm-product-img"
                    onError={() => setFailedImages((prev) => new Set([...prev, p.image_url!]))} />
                )}
                <div className="pm-product-name">{p.title}</div>
                {p.outcome && <div className="pm-product-outcome">{p.outcome}</div>}
                <div className="pm-product-desc">
                  {p.problem && <span>{p.problem} </span>}
                  {p.solution && <span>{p.solution}</span>}
                </div>
                {p.stack.length > 0 && (
                  <div className="pm-product-tags">
                    {p.stack.map((t) => <span key={t} className="pm-product-tag">{t}</span>)}
                  </div>
                )}
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="pm-product-link" style={{ display: 'inline-block', marginTop: 12 }}>View product →</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills.length > 0 && (
        <section id="skills" className="pm-section">
          <div className="pm-section-eyebrow">Expertise</div>
          <div className="pm-section-title">Skills</div>
          <div className="pm-skills-groups">
            {skillGroups.map(([cat, items]) => (
              <div key={cat} className="pm-skill-group">
                <div className="pm-skill-group-title">{cat}</div>
                <div className="pm-skill-pills">
                  {items.map((s) => <span key={s} className="pm-skill-pill">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {content.experience.length > 0 && (
        <section id="experience" className="pm-section">
          <div className="pm-section-eyebrow">Career</div>
          <div className="pm-section-title">Experience</div>
          <div className="pm-exp-list">
            {content.experience.map((e, i) => (
              <div key={i} className="pm-exp-item">
                <div className="pm-exp-dot" />
                <div className="pm-exp-role">{e.role}</div>
                <div className="pm-exp-co">{e.company}</div>
                <div className="pm-exp-period">{e.period}</div>
                {e.bullets.length > 0 && (
                  <ul className="pm-exp-bullets">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="pm-exp-bullet">
                        <span className="pm-bullet-mark">✦</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <div id="contact" className="pm-contact">
        <h2 className="pm-contact-title">Let&apos;s build something great.</h2>
        <p className="pm-contact-sub">Open to full-time product roles, advisory, and consulting.</p>
        <a href={`mailto:${content.email}`} className="pm-contact-cta">Get in touch →</a>
      </div>

      <footer className="pm-footer">
        <span>{content.name} · {content.role}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
