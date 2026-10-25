'use client'

import Image from 'next/image'
import { useId, useState } from 'react'
import type { PortfolioContent } from './Minimal'
import './template-fonts.css' // self-hosted fonts (no request to Google Fonts)

const css = `
  .sci-root {
    --bg: #134E4A;
    --surface: #0D3330;
    --primary: #0F766E;
    --accent: #2DD4BF;
    --text: #F0FDFA;
    --muted: #B2FAF0;
    --border: #115E59;
    background: var(--bg);
    color: var(--text);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    min-height: 100vh;
    overflow-wrap: anywhere;
  }
  .sci-root section[id] { scroll-margin-top: 80px; }
  .sci-root a:focus-visible, .sci-root button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .sci-prose { white-space: pre-line; font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
  .sci-project-links { display: flex; flex-wrap: wrap; gap: 16px; }
  .sci-nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 6vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .sci-nav-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px; font-weight: 700; color: var(--accent);
  }
  .sci-nav-links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 16px; }
  .sci-nav-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; color: var(--muted);
    text-decoration: none; letter-spacing: 0.08em;
    text-transform: uppercase; transition: color 0.2s;
  }
  .sci-nav-link:hover { color: var(--accent); }

  .sci-body { padding: 0 6vw; max-width: 1100px; margin: 0 auto; }

  /* Hero */
  .sci-hero {
    padding: 48px 0 40px;
    border-bottom: 1px solid var(--border);
  }
  .sci-hero-name {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: clamp(24px, 3.5vw, 40px);
    font-weight: 600;
    margin-bottom: 4px;
    background: linear-gradient(135deg, #F0FDFA 0%, #2DD4BF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sci-hero-role {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px; color: var(--accent);
    margin-bottom: 8px;
  }
  .sci-hero-headline {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 17px; color: var(--text);
    line-height: 1.6; margin-bottom: 10px;
    max-width: 680px;
  }
  .sci-hero-about {
    font-size: 15px; color: #B2FAF0;
    line-height: 1.7; margin-bottom: 16px;
    max-width: 680px;
    white-space: pre-line;
  }
  .sci-hero-meta { display: flex; gap: 16px; flex-wrap: wrap; }
  .sci-hero-meta-item {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; color: var(--muted);
  }
  .sci-hero-meta-item a { color: var(--accent); text-decoration: none; }
  .sci-hero-meta-item a:hover { text-decoration: underline; }

  /* Section */
  .sci-section {
    padding: 40px 0;
    border-bottom: 1px solid var(--border);
  }
  .sci-section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--accent);
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .sci-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* Skills */
  .sci-matrix { display: flex; flex-direction: column; gap: 20px; }
  .sci-matrix-group {}
  .sci-matrix-cat-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .sci-matrix-cat {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--accent);
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .sci-matrix-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .sci-matrix-pill {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; padding: 4px 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; color: var(--muted);
    transition: all 0.15s;
  }
  .sci-matrix-pill:hover { border-color: var(--accent); color: var(--accent); }

  /* Projects */
  .sci-projects { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .sci-proj-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
    transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  }
  .sci-proj-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
  }
  .sci-proj-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .sci-proj-body { padding: 20px; }
  .sci-proj-name {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px; font-weight: 600;
    color: var(--text); margin-bottom: 6px;
  }
  .sci-proj-outcome {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; color: #2DD4BF;
    background: rgba(13,51,48,0.8);
    border: 1px solid rgba(45,212,191,0.3);
    border-radius: 4px; padding: 5px 10px;
    margin-bottom: 10px;
  }
  .sci-proj-outcome::before { content: '> '; }
  .sci-proj-desc { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 10px; }
  .sci-proj-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
  .sci-proj-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; padding: 2px 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
  }
  .sci-proj-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; color: var(--accent);
    text-decoration: none; transition: opacity 0.15s;
  }
  .sci-proj-link:hover { opacity: 0.7; }

  /* Experience */
  .sci-exp-list { display: flex; flex-direction: column; gap: 24px; }
  .sci-exp-item { padding-left: 20px; border-left: 2px solid var(--primary); position: relative; }
  .sci-exp-dot { position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .sci-exp-role { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .sci-exp-co { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--accent); margin-bottom: 2px; }
  .sci-exp-period { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
  .sci-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .sci-exp-bullet { font-size: 15px; color: var(--muted); line-height: 1.7; display: flex; gap: 8px; }
  .sci-bullet-mark { color: var(--accent); flex-shrink: 0; }

  /* GitHub CTA */
  .sci-gh-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .sci-gh-text { font-size: 15px; color: var(--muted); line-height: 1.7; }
  .sci-gh-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; padding: 8px 18px;
    background: var(--primary); color: var(--text);
    border-radius: 6px; text-decoration: none; transition: background 0.15s;
    flex-shrink: 0;
  }
  .sci-gh-link:hover { background: var(--accent); color: var(--surface); }

  /* Contact */
  .sci-contact { padding: 40px 0 60px; }
  .sci-contact-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: var(--accent);
    color: var(--surface); border-radius: 6px;
    font-weight: 600; font-size: 14px; text-decoration: none;
    transition: opacity 0.2s; margin-bottom: 12px;
  }
  .sci-contact-cta:hover { opacity: 0.85; }
  .sci-contact-meta { font-size: 15px; color: var(--muted); line-height: 1.7; }
  .sci-contact-meta a { color: var(--accent); text-decoration: none; }
  .sci-footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 16px 6vw;
    display: flex; justify-content: space-between;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: #5EEAD4;
  }
  .sci-footer a { color: #5EEAD4; text-decoration: none; transition: color 0.2s; }
  .sci-footer a:hover { color: var(--accent); }

  .sci-hamburger { display: none; background: none; border: none; color: var(--accent); padding: 8px; font-size: 18px; cursor: pointer; }
  .sci-mobile-menu { display: none; background: var(--surface); padding: 12px 6vw; }
  .sci-mobile-menu a { padding: 8px 0; }

  @media (max-width: 700px) {
    .sci-projects { grid-template-columns: 1fr; }
    .sci-hero { grid-template-columns: 1fr; }
    .sci-nav-links { display: none; }
    .sci-hamburger { display: block; }
    .sci-mobile-menu.open { display: flex; flex-direction: column; }
    .sci-gh-card { flex-direction: column; align-items: flex-start; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sci-root *, .sci-root *::before, .sci-root *::after { animation: none !important; transition: none !important; }
    .sci-proj-card:hover { transform: none; }
  }
`

export default function DataScientist({ content }: { content: PortfolioContent }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuId = useId()
  const grouped = (content.skills_grouped ?? []).filter(g => g.items?.length > 0)
  const groupedSkills = new Set(grouped.flatMap(g => g.items))
  const ungroupedSkills = content.skills.filter(skill => !groupedSkills.has(skill))
  const hasSkills = grouped.length > 0 || ungroupedSkills.length > 0 || !!content.skills_narrative
  const hasContact = !!(content.email || content.github_url || content.linkedin_url)
  const navLinks = [
    { id: 'skills', label: 'Skills', show: hasSkills },
    { id: 'projects', label: 'Projects', show: content.projects.length > 0 },
    { id: 'experience', label: 'Experience', show: content.experience.length > 0 },
    { id: 'education', label: 'Education', show: !!content.education?.length },
    { id: 'certifications', label: 'Certifications', show: !!content.certifications?.length },
    { id: 'testimonials', label: 'Testimonials', show: !!content.testimonials?.length },
    { id: 'contact', label: 'Contact', show: hasContact },
  ].filter(link => link.show)

  return (
    <div className="sci-root">
      <style>{css}</style>

      <nav className="sci-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="sci-nav-links">
          {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="sci-nav-link">{link.label}</a>)}
        </div>
        {navLinks.length > 0 && <button type="button" className="sci-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen} aria-controls={menuId}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>}
      </nav>
      <div id={menuId} className={`sci-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
        {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="sci-nav-link" onClick={() => setMobileMenuOpen(false)}>{link.label}</a>)}
      </div>

      <div className="sci-body">
        {/* Hero */}
        <div className="sci-hero">
          <div>
            <h1 className="sci-hero-name">{content.name}</h1>
            <div className="sci-hero-role">{content.role}</div>
            {content.headline && <div className="sci-hero-headline">{content.headline}</div>}
            {content.about && <div className="sci-hero-about">{content.about}</div>}
            <div className="sci-hero-meta">
              {content.location && <span className="sci-hero-meta-item">{content.location}</span>}
              {content.email && <span className="sci-hero-meta-item"><a href={`mailto:${content.email}`}>{content.email}</a></span>}
              {content.github_url && <span className="sci-hero-meta-item"><a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a></span>}
              {content.linkedin_url && <span className="sci-hero-meta-item"><a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a></span>}
            </div>
          </div>
        </div>

        {/* Skills */}
        {hasSkills && (
          <section id="skills" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Skills</h2>
            {content.skills_narrative && <p className="sci-prose">{content.skills_narrative}</p>}
            <div className="sci-matrix">
              {grouped.map(({ category, items }, i) => (
                <div key={i} className="sci-matrix-group">
                  <div className="sci-matrix-cat-row">
                    <h3 className="sci-matrix-cat">{category}</h3>
                  </div>
                  <div className="sci-matrix-pills">
                    {items.map((s) => <span key={s} className="sci-matrix-pill">{s}</span>)}
                  </div>
                </div>
              ))}
              {ungroupedSkills.length > 0 && <div className="sci-matrix-pills">
                {ungroupedSkills.map(s => <span key={s} className="sci-matrix-pill">{s}</span>)}
              </div>}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects.length > 0 && (
          <section id="projects" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Projects</h2>
            <div className="sci-projects">
              {content.projects.map((p, i) => (
                <div key={i} className="sci-proj-card">
                  {p.image_url && !failedImages.has(p.image_url) && (
                  <Image src={p.image_url} alt={p.title} width={640} height={360} className="sci-proj-img"
                    onError={() => setFailedImages((prev) => new Set([...prev, p.image_url!]))} />
                )}
                  <div className="sci-proj-body">
                    <div className="sci-proj-name">{p.title}</div>
                    {p.outcome && <div className="sci-proj-outcome">{p.outcome}</div>}
                    <div className="sci-proj-desc">
                      {p.problem && <span>{p.problem} </span>}
                      {p.solution && <span>{p.solution}</span>}
                    </div>
                    {p.stack.length > 0 && (
                      <div className="sci-proj-tags">
                        {p.stack.map((t) => <span key={t} className="sci-proj-tag">{t}</span>)}
                      </div>
                    )}
                    {(p.url || p.github_url) && <div className="sci-project-links">
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="sci-proj-link">View demo ↗</a>}
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="sci-proj-link">Repository ↗</a>}
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {content.experience.length > 0 && (
          <section id="experience" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Experience</h2>
            <div className="sci-exp-list">
              {content.experience.map((e, i) => (
                <div key={i} className="sci-exp-item">
                  <div className="sci-exp-dot" />
                  <div className="sci-exp-role">{e.role}</div>
                  <div className="sci-exp-co">{e.company}</div>
                  <div className="sci-exp-period">{e.period}</div>
                  {e.bullets.length > 0 && (
                    <ul className="sci-exp-bullets">
                      {e.bullets.map((b, j) => (
                        <li key={j} className="sci-exp-bullet">
                          <span className="sci-bullet-mark">▸</span><span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GitHub */}
        {content.github_url && (
          <section className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; GitHub</h2>
            <div className="sci-gh-card">
              <div className="sci-gh-text">GitHub profile</div>
              <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="sci-gh-link">View GitHub →</a>
            </div>
          </section>
        )}

        {/* Education */}
        {content.education && content.education.length > 0 && (
          <section id="education" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Education</h2>
            <div className="sci-exp-list">
              {content.education.map((ed, i) => (
                <div key={i} className="sci-exp-item">
                  <div className="sci-exp-dot" />
                  <div className="sci-exp-role">{ed.degree}</div>
                  <div className="sci-exp-co">{ed.institution}</div>
                  <div className="sci-exp-period">{ed.year || (ed as typeof ed & { period?: string }).period}{ed.grade ? ` · ${ed.grade}` : ''}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {content.certifications && content.certifications.length > 0 && (
          <section id="certifications" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Certifications</h2>
            <div className="sci-matrix-pills">
              {content.certifications.map((cert) => (
                <span key={cert} className="sci-matrix-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>{cert}</span>
              ))}
            </div>
          </section>
        )}

        {content.testimonials && content.testimonials.length > 0 && (
          <section id="testimonials" className="sci-section">
            <h2 className="sci-section-label">&gt;&gt;&gt; Testimonials</h2>
            <div className="sci-exp-list">
              {content.testimonials.map((testimonial, i) => (
                <figure key={i} className="sci-exp-item">
                  <blockquote className="sci-prose">{testimonial.text}</blockquote>
                  <figcaption>{[testimonial.author, testimonial.role, testimonial.company].filter(Boolean).join(' · ')}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {hasContact && <section id="contact" className="sci-contact">
          <h2 className="sci-section-label">&gt;&gt;&gt; Contact</h2>
          {content.email && <a href={`mailto:${content.email}`} className="sci-contact-cta">Get in touch →</a>}
          <div className="sci-contact-meta sci-project-links">
            {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a>}
            {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a>}
            {content.location && <span>{content.location}</span>}
          </div>
        </section>}
      </div>

      <footer className="sci-footer">
        <span>{content.name}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
