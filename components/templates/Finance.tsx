'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  .fin-root {
    --bg: #0F172A;
    --surface: #1E293B;
    --primary: #1E3A8A;
    --accent: #93C5FD;
    --text: #F8FAFC;
    --muted: #94A3B8;
    --border: #1E3A8A;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
  }
  .fin-nav {
    background: var(--surface);
    border-bottom: 1px solid rgba(30,58,138,0.4);
    padding: 14px 6vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .fin-nav-name { font-size: 14px; font-weight: 700; color: var(--accent); letter-spacing: 0.02em; }
  .fin-nav-links { display: flex; gap: 28px; }
  .fin-nav-link { font-size: 12px; color: var(--muted); text-decoration: none; font-weight: 500; letter-spacing: 0.04em; transition: color 0.2s; text-transform: uppercase; }
  .fin-nav-link:hover { color: var(--accent); }

  .fin-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    min-height: calc(100vh - 49px);
  }

  /* Left sidebar */
  .fin-sidebar {
    background: var(--surface);
    border-right: 1px solid rgba(30,58,138,0.4);
    padding: 40px 28px;
    display: flex; flex-direction: column; gap: 32px;
  }
  .fin-avatar {
    width: 80px; height: 80px;
    border-radius: 8px; object-fit: cover;
    border: 1px solid var(--border);
  }
  .fin-avatar-ph {
    width: 80px; height: 80px; border-radius: 8px;
    background: var(--primary);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: var(--accent);
    border: 1px solid var(--border);
  }
  .fin-sidebar-name { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .fin-sidebar-role { font-size: 13px; color: var(--accent); margin-bottom: 8px; letter-spacing: 0.02em; }
  .fin-sidebar-meta { font-size: 12px; color: var(--muted); line-height: 1.7; }
  .fin-sidebar-meta a { color: var(--accent); text-decoration: none; }

  .fin-sidebar-block {}
  .fin-block-title {
    font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--accent); font-weight: 600;
    margin-bottom: 14px; padding-bottom: 8px;
    border-bottom: 1px solid rgba(30,58,138,0.4);
  }

  /* About text in sidebar */
  .fin-about { font-size: 13px; color: var(--muted); line-height: 1.8; }
  .fin-about p { margin-bottom: 10px; }

  /* Skills in sidebar */
  .fin-skill-group { margin-bottom: 16px; }
  .fin-skill-cat { font-size: 10px; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
  .fin-skill-pills { display: flex; flex-wrap: wrap; gap: 5px; }
  .fin-skill-pill {
    font-size: 11px; padding: 3px 9px;
    background: rgba(30,58,138,0.3);
    border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
  }

  /* Contact in sidebar */
  .fin-contact-links { display: flex; flex-direction: column; gap: 8px; }
  .fin-contact-link { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; display: flex; align-items: center; gap: 8px; }
  .fin-contact-link:hover { color: var(--accent); }
  .fin-footer-link { font-size: 10px; color: #1E3A8A; text-decoration: none; margin-top: auto; transition: color 0.2s; }
  .fin-footer-link:hover { color: var(--accent); }

  /* Right main */
  .fin-main { padding: 40px 40px; overflow-y: auto; }

  .fin-section {
    margin-bottom: 48px;
    opacity: 0; transform: translateY(10px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .fin-section.visible { opacity: 1; transform: none; }
  .fin-section-label {
    font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--accent); font-weight: 600;
    margin-bottom: 20px; padding-bottom: 8px;
    border-bottom: 1px solid rgba(30,58,138,0.4);
    display: flex; align-items: center; justify-content: space-between;
  }

  /* Projects */
  .fin-projects { display: flex; flex-direction: column; gap: 14px; }
  .fin-proj-card {
    background: var(--surface);
    border: 1px solid rgba(30,58,138,0.4);
    border-left: 3px solid var(--primary);
    border-radius: 6px; padding: 20px;
    transition: border-left-color 0.2s;
  }
  .fin-proj-card:hover { border-left-color: var(--accent); }
  .fin-proj-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .fin-proj-outcome {
    font-size: 13px; font-weight: 600;
    color: var(--accent); margin-bottom: 8px;
  }
  .fin-proj-desc { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 10px; }
  .fin-proj-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .fin-proj-tag {
    font-size: 10px; padding: 2px 8px;
    background: rgba(30,58,138,0.2);
    border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
  }
  .fin-proj-link { font-size: 11px; color: var(--accent); text-decoration: none; transition: opacity 0.15s; display: inline-block; margin-top: 8px; }
  .fin-proj-link:hover { opacity: 0.7; }

  /* Experience */
  .fin-exp-list { display: flex; flex-direction: column; gap: 24px; }
  .fin-exp-item { padding-left: 18px; border-left: 2px solid var(--primary); position: relative; }
  .fin-exp-dot { position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .fin-exp-role { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .fin-exp-co { font-size: 12px; color: var(--accent); font-weight: 600; margin-bottom: 2px; }
  .fin-exp-period { font-size: 11px; color: var(--muted); margin-bottom: 8px; }
  .fin-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .fin-exp-bullet { font-size: 12px; color: var(--muted); line-height: 1.6; display: flex; gap: 8px; }
  .fin-bullet-mark { color: var(--accent); flex-shrink: 0; }

  @media (max-width: 900px) {
    .fin-layout { grid-template-columns: 1fr; }
    .fin-sidebar { border-right: none; border-bottom: 1px solid rgba(30,58,138,0.4); padding: 28px 6vw; }
    .fin-main { padding: 28px 6vw; }
    .fin-nav-links { display: none; }
  }
`

const MODEL_KEYWORDS = ['excel', 'vba', 'bloomberg', 'capital iq', 'dcf', 'lbo', 'financial model', 'valuation']
const ANALYTICS_KEYWORDS = ['sql', 'power bi', 'tableau', 'python', 'r ', 'pandas', 'numpy', 'looker', 'alteryx']

function groupFinanceSkills(skills: string[]) {
  const groups: Record<string, string[]> = { Modelling: [], Analytics: [], Other: [] }
  for (const s of skills) {
    const sl = s.toLowerCase()
    if (MODEL_KEYWORDS.some((k) => sl.includes(k))) groups['Modelling'].push(s)
    else if (ANALYTICS_KEYWORDS.some((k) => sl.includes(k))) groups['Analytics'].push(s)
    else groups['Other'].push(s)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

export default function Finance({ content }: { content: PortfolioContent }) {
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll('.fin-section')
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
    : groupFinanceSkills(content.skills)

  return (
    <div className="fin-root">
      <style>{css}</style>

      <nav className="fin-nav">
        <span className="fin-nav-name">{content.name}</span>
        <div className="fin-nav-links">
          {content.projects.length > 0 && <a href="#projects" className="fin-nav-link">Work</a>}
          {content.experience.length > 0 && <a href="#experience" className="fin-nav-link">Experience</a>}
          <a href="#contact" className="fin-nav-link">Contact</a>
        </div>
      </nav>

      <div className="fin-layout">
        {/* Sidebar */}
        <aside className="fin-sidebar">
          {content.avatar_url ? (
            <Image src={content.avatar_url} alt={content.name} width={80} height={80} className="fin-avatar" />
          ) : (
            <div className="fin-avatar-ph">◆</div>
          )}

          <div>
            <div className="fin-sidebar-name">{content.name}</div>
            <div className="fin-sidebar-role">{content.role}</div>
            <div className="fin-sidebar-meta">
              {content.location && <div>{content.location}</div>}
            </div>
          </div>

          <div className="fin-sidebar-block">
            <div className="fin-block-title">About</div>
            <div className="fin-about">
              {content.about.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          {content.skills.length > 0 && (
            <div className="fin-sidebar-block">
              <div className="fin-block-title">Tools &amp; Skills</div>
              {skillGroups.map(([cat, items]) => (
                <div key={cat} className="fin-skill-group">
                  <div className="fin-skill-cat">{cat}</div>
                  <div className="fin-skill-pills">
                    {items.map((s) => <span key={s} className="fin-skill-pill">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="fin-sidebar-block" id="contact">
            <div className="fin-block-title">Contact</div>
            <div className="fin-contact-links">
              <a href={`mailto:${content.email}`} className="fin-contact-link">
                <span>✉</span><span>{content.email}</span>
              </a>
              {content.linkedin_url && (
                <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="fin-contact-link">
                  <span>◈</span><span>LinkedIn</span>
                </a>
              )}
              {content.github_url && (
                <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="fin-contact-link">
                  <span>⌥</span><span>GitHub</span>
                </a>
              )}
            </div>
          </div>

          <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer" className="fin-footer-link">
            Built with liveportfolio.site
          </a>
        </aside>

        {/* Main */}
        <main className="fin-main" ref={mainRef}>
          {/* Headline */}
          <section className="fin-section">
            <div className="fin-section-label">Overview</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>
              {content.headline}
            </div>
          </section>

          {/* Projects */}
          {content.projects.length > 0 && (
            <section id="projects" className="fin-section">
              <div className="fin-section-label">Selected Work</div>
              <div className="fin-projects">
                {content.projects.map((p, i) => (
                  <div key={i} className="fin-proj-card">
                    <div className="fin-proj-name">{p.title}</div>
                    {p.outcome && <div className="fin-proj-outcome">{p.outcome}</div>}
                    <div className="fin-proj-desc">
                      {p.problem && <span>{p.problem} </span>}
                      {p.solution && <span>{p.solution}</span>}
                    </div>
                    {p.stack.length > 0 && (
                      <div className="fin-proj-tags">
                        {p.stack.map((t) => <span key={t} className="fin-proj-tag">{t}</span>)}
                      </div>
                    )}
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="fin-proj-link">View →</a>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Experience */}
          {content.experience.length > 0 && (
            <section id="experience" className="fin-section">
              <div className="fin-section-label">Career History</div>
              <div className="fin-exp-list">
                {content.experience.map((e, i) => (
                  <div key={i} className="fin-exp-item">
                    <div className="fin-exp-dot" />
                    <div className="fin-exp-role">{e.role}</div>
                    <div className="fin-exp-co">{e.company}</div>
                    <div className="fin-exp-period">{e.period}</div>
                    {e.bullets.length > 0 && (
                      <ul className="fin-exp-bullets">
                        {e.bullets.map((b, j) => (
                          <li key={j} className="fin-exp-bullet">
                            <span className="fin-bullet-mark">•</span><span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
