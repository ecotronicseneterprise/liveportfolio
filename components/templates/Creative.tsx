'use client'

import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const creativeFonts = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300;1,9..144,600&family=JetBrains+Mono:wght@400;500&display=swap');
`

const css = `
  .nt-root {
    --ink: #0d0d0d;
    --paper: #f5f2eb;
    --cream: #ede9de;
    --accent: #c8401a;
    --accent2: #1a5c8f;
    --muted: #7a7060;
    --border: #d4cfc2;
    --card: #faf8f3;
    background: var(--paper);
    color: var(--ink);
    font-family: 'Space Grotesk', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Header */
  .nt-header {
    padding: 32px 6vw 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    border-bottom: 1px solid var(--border);
  }
  .nt-name {
    font-family: 'Fraunces', serif;
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .nt-name em { font-style: italic; color: var(--accent); }
  .nt-badge {
    display: inline-block;
    margin-top: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--border);
    padding: 4px 10px;
  }
  .nt-header-right { text-align: right; padding-top: 8px; }
  .nt-status {
    font-size: 12px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 12px;
  }
  .nt-status-dot {
    display: inline-block;
    width: 7px; height: 7px;
    background: #22c55e;
    border-radius: 50%;
    margin-right: 6px;
    animation: nt-pulse 2s infinite;
  }
  @keyframes nt-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .nt-nav { display: flex; gap: 20px; justify-content: flex-end; flex-wrap: wrap; }
  .nt-nav a {
    font-size: 11px;
    color: var(--muted);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: color 0.2s;
  }
  .nt-nav a:hover { color: var(--accent); }

  /* Hero */
  .nt-hero {
    width: 100%;
    margin: 56px 0 0;
    padding: 0 6vw;
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 60px;
    align-items: start;
  }
  .nt-hero-statement {
    font-family: 'Fraunces', serif;
    font-size: clamp(20px, 2.5vw, 32px);
    font-weight: 300;
    line-height: 1.45;
    color: var(--ink);
  }
  .nt-hero-statement strong { font-weight: 600; font-style: italic; color: var(--accent); }
  .nt-hero-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
  .nt-hero-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    text-decoration: none;
    letter-spacing: 0.05em;
    transition: opacity 0.2s;
  }
  .nt-hero-link:hover { opacity: 0.75; }
  .nt-hero-link-primary { background: var(--accent); color: white; }
  .nt-hero-link-secondary { background: var(--accent2); color: white; }
  .nt-hero-link-ghost { background: transparent; color: var(--ink); border: 1px solid var(--border); }
  .nt-meta-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .nt-meta-item:last-child { border-bottom: none; margin-bottom: 0; }
  .nt-meta-num {
    font-family: 'Fraunces', serif;
    font-size: 30px;
    font-weight: 600;
    color: var(--accent);
    line-height: 1;
    min-width: 64px;
  }
  .nt-meta-desc { font-size: 12px; color: var(--muted); line-height: 1.6; padding-top: 2px; }
  .nt-meta-desc strong { display: block; color: var(--ink); font-size: 13px; margin-bottom: 2px; }

  /* Section */
  .nt-section {
    width: 100%;
    margin: 72px 0 0;
    padding: 0 6vw;
  }
  .nt-section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }
  .nt-section-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.12em;
  }
  .nt-section-title {
    font-family: 'Fraunces', serif;
    font-size: 26px;
    font-weight: 300;
    font-style: italic;
  }
  .nt-section-line { flex: 1; height: 1px; background: var(--border); }

  /* About */
  .nt-about {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.8;
    max-width: 700px;
  }
  .nt-about p { margin-bottom: 14px; }
  .nt-about p:last-child { margin-bottom: 0; }

  /* Skills */
  .nt-skills-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    background: var(--border);
    border: 1px solid var(--border);
  }
  .nt-skill-cell { background: var(--card); padding: 18px; }
  .nt-skill-cat {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .nt-skill-items { font-size: 12px; color: var(--ink); line-height: 2; }

  /* Projects */
  .nt-projects-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    background: var(--border);
    border: 1px solid var(--border);
  }
  .nt-project-card {
    background: var(--card);
    padding: 28px;
    transition: background 0.2s;
  }
  .nt-project-card:hover { background: var(--cream); }
  .nt-project-card.nt-featured {
    grid-column: 1 / -1;
  }
  .nt-p-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .nt-p-name {
    font-family: 'Fraunces', serif;
    font-size: 20px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 8px;
    line-height: 1.2;
  }
  .nt-p-desc { font-size: 13px; color: var(--muted); line-height: 1.7; margin-bottom: 16px; }
  .nt-p-outcome {
    display: inline-block;
    background: var(--accent);
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 3px 8px;
    margin-bottom: 12px;
  }
  .nt-p-stack { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; }
  .nt-stack-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    border: 1px solid var(--border);
    padding: 2px 7px;
  }
  .nt-p-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 16px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  .nt-p-link:hover { opacity: 0.7; }

  /* Experience */
  .nt-exp-item {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 32px;
    padding: 26px 0;
    border-bottom: 1px solid var(--border);
    align-items: start;
  }
  .nt-exp-item:first-child { padding-top: 0; }
  .nt-exp-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.05em;
    padding-top: 4px;
  }
  .nt-exp-role {
    font-family: 'Fraunces', serif;
    font-size: 17px;
    font-weight: 600;
    color: var(--ink);
  }
  .nt-exp-company {
    font-size: 12px;
    color: var(--accent);
    margin: 4px 0 10px;
    font-weight: 500;
  }
  .nt-exp-bullets { list-style: none; }
  .nt-exp-bullets li {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
    padding-left: 14px;
    position: relative;
    margin-bottom: 3px;
  }
  .nt-exp-bullets li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent);
    font-size: 10px;
    top: 2px;
  }

  /* Contact */
  .nt-contact {
    width: 100%;
    margin: 72px 0 0;
    padding: 40px 6vw;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
  }
  .nt-contact-headline {
    font-family: 'Fraunces', serif;
    font-size: 32px;
    font-weight: 300;
    font-style: italic;
    margin-bottom: 6px;
  }
  .nt-contact-sub { font-size: 13px; color: var(--muted); }
  .nt-contact-links { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
  .nt-contact-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--ink);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.2s;
  }
  .nt-contact-link:hover { color: var(--accent); }
  .nt-contact-link span {
    color: var(--muted);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    min-width: 56px;
    text-align: right;
  }

  /* Footer */
  .nt-footer {
    width: 100%;
    margin: 0 0 40px;
    padding: 20px 6vw 0;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.05em;
  }

  /* Mobile */
  @media (max-width: 700px) {
    .nt-header { flex-direction: column; gap: 16px; padding: 20px 5vw 16px; }
    .nt-header-right { text-align: left; }
    .nt-nav { justify-content: flex-start; }
    .nt-hero { grid-template-columns: 1fr; padding: 0 5vw; gap: 32px; margin-top: 36px; }
    .nt-projects-grid { grid-template-columns: 1fr; }
    .nt-project-card.nt-featured { grid-column: 1; }
    .nt-section { padding: 0 5vw; }
    .nt-skills-grid { grid-template-columns: 1fr 1fr; }
    .nt-contact { flex-direction: column; padding: 32px 5vw; }
    .nt-contact-links { align-items: flex-start; }
    .nt-exp-item { grid-template-columns: 1fr; gap: 6px; }
    .nt-footer { flex-direction: column; gap: 4px; padding: 16px 5vw 0; }
  }
`

export default function Creative({ content }: { content: PortfolioContent }) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Fade-in on scroll
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.nt-fade')
    if (!els) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'none' } }),
      { threshold: 0.08 }
    )
    els.forEach(el => {
      ;(el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(16px)'
      ;(el as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease'
      obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Extract hero stats from project outcomes that contain numbers
  const statsProjects = content.projects
    .filter(p => p.outcome && /\d/.test(p.outcome))
    .slice(0, 3)

  return (
    <div className="nt-root" ref={rootRef}>
      <style>{creativeFonts}{css}</style>

      {/* Header */}
      <header className="nt-header">
        <div>
          <h1 className="nt-name">{content.name}</h1>
          <div className="nt-badge">{content.role}</div>
        </div>
        <div className="nt-header-right">
          <div className="nt-status">
            <span className="nt-status-dot" />
            {content.location || 'Available · Remote'}
          </div>
          <nav className="nt-nav">
            {content.projects.length > 0 && <a href="#work">Work</a>}
            {content.experience.length > 0 && <a href="#experience">Experience</a>}
            {content.skills.length > 0 && <a href="#skills">Skills</a>}
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="nt-hero nt-fade">
        <div>
          <p className="nt-hero-statement">
            {content.headline
              ? content.headline.split(/(\bAI\b|\bML\b|[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/).map((part, i) =>
                  /^[A-Z]/.test(part) && part.length > 3 && i > 0
                    ? <strong key={i}>{part}</strong>
                    : part
                )
              : content.about?.split('\n')[0]}
          </p>
          <div className="nt-hero-links">
            {content.github_url && (
              <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="nt-hero-link nt-hero-link-secondary">
                ↗ GitHub
              </a>
            )}
            {content.linkedin_url && (
              <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="nt-hero-link nt-hero-link-ghost">
                ↗ LinkedIn
              </a>
            )}
            <a href={`mailto:${content.email}`} className="nt-hero-link nt-hero-link-primary">
              → Get in touch
            </a>
          </div>
        </div>

        {/* Stats from project outcomes */}
        <div>
          {statsProjects.map((p, i) => {
            const match = p.outcome.match(/[\d,]+[%+kKmMbB₦$£€]?|\d+[\w.]+/)
            return (
              <div key={i} className="nt-meta-item">
                <div className="nt-meta-num">{match ? match[0] : `0${i + 1}`}</div>
                <div className="nt-meta-desc">
                  <strong>{p.title}</strong>
                  {p.outcome}
                </div>
              </div>
            )
          })}
          {statsProjects.length === 0 && content.about && (
            <div className="nt-meta-item">
              <div className="nt-meta-num" style={{ fontSize: 14, paddingTop: 4, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--muted)', minWidth: 0 }}>
                {content.about.split(' ').slice(0, 60).join(' ')}{content.about.split(' ').length > 60 ? '…' : ''}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Projects */}
      {content.projects.length > 0 && (
        <section className="nt-section nt-fade" id="work">
          <div className="nt-section-header">
            <span className="nt-section-num">01</span>
            <h2 className="nt-section-title">Key Projects</h2>
            <div className="nt-section-line" />
          </div>
          <div className="nt-projects-grid">
            {content.projects.map((p, i) => {
              // First card: always full-width featured
              // Remaining cards: if the remaining count is odd and this is the last, span full width
              const remaining = content.projects.length - 1
              const isLastOdd = i > 0 && remaining % 2 !== 0 && i === content.projects.length - 1
              return (
              <div key={i} className={`nt-project-card${i === 0 ? ' nt-featured' : ''}${isLastOdd ? ' nt-featured' : ''}`}>
                <div className="nt-p-label">{p.stack.slice(0, 3).join(' · ')}</div>
                <div className="nt-p-name">{p.title}</div>
                <div className="nt-p-desc">{p.problem} {p.solution}</div>
                {p.outcome && <div className="nt-p-outcome">{p.outcome}</div>}
                <div className="nt-p-stack">
                  {p.stack.map((s, j) => <span key={j} className="nt-stack-tag">{s}</span>)}
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="nt-p-link">
                    View project →
                  </a>
                )}
              </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Experience */}
      {content.experience.length > 0 && (
        <section className="nt-section nt-fade" id="experience">
          <div className="nt-section-header">
            <span className="nt-section-num">02</span>
            <h2 className="nt-section-title">Experience</h2>
            <div className="nt-section-line" />
          </div>
          <div>
            {content.experience.map((e, i) => (
              <div key={i} className="nt-exp-item">
                <div className="nt-exp-date">{e.period}</div>
                <div>
                  <div className="nt-exp-role">{e.role}</div>
                  <div className="nt-exp-company">{e.company}</div>
                  <ul className="nt-exp-bullets">
                    {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills.length > 0 && (
        <section className="nt-section nt-fade" id="skills">
          <div className="nt-section-header">
            <span className="nt-section-num">03</span>
            <h2 className="nt-section-title">Technical Stack</h2>
            <div className="nt-section-line" />
          </div>
          {content.skills_grouped && content.skills_grouped.length > 0 ? (
            <div className="nt-skills-grid">
              {content.skills_grouped.map((g, i) => (
                <div key={i} className="nt-skill-cell">
                  <div className="nt-skill-cat">{g.category}</div>
                  <div className="nt-skill-items">{g.items.join('\n').split('\n').map((s, j) => <span key={j}>{s}<br /></span>)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="nt-skills-grid">
              {Array.from({ length: Math.ceil(content.skills.length / 4) }, (_, i) => (
                <div key={i} className="nt-skill-cell">
                  <div className="nt-skill-items">
                    {content.skills.slice(i * 4, i * 4 + 4).map((s, j) => <span key={j}>{s}<br /></span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Contact */}
      <div className="nt-contact nt-fade" id="contact">
        <div>
          <div className="nt-contact-headline">Let&apos;s build something.</div>
          <div className="nt-contact-sub">Open to remote, contract, and full-time opportunities.</div>
        </div>
        <div className="nt-contact-links">
          <a href={`mailto:${content.email}`} className="nt-contact-link">
            <span>Email</span>{content.email}
          </a>
          {content.linkedin_url && (
            <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="nt-contact-link">
              <span>LinkedIn</span>{content.linkedin_url.replace('https://linkedin.com/in/', '')}
            </a>
          )}
          {content.github_url && (
            <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="nt-contact-link">
              <span>GitHub</span>{content.github_url.replace('https://github.com/', '')}
            </a>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="nt-footer">
        <span>{content.name} · {content.role}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          liveportfolio.site
        </a>
      </div>
    </div>
  )
}
