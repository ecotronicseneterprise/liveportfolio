'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import type { PortfolioContent } from './Minimal'
import './template-fonts.css' // self-hosted fonts (no request to Google Fonts)

const css = `
  .cy-root {
    --bg: #052E16;
    --surface: #14532D;
    --primary: #166534;
    --accent: #4ADE80;
    --text: #F0FDF4;
    --muted: #86EFAC;
    --border: #166534;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
    overflow-wrap: anywhere;
  }
  .cy-root section[id] { scroll-margin-top: 80px; }
  .cy-root a:focus-visible, .cy-root button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .cy-prose { white-space: pre-line; font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
  .cy-project-links { display: flex; flex-wrap: wrap; gap: 16px; }

  /* Scanline effect on nav */
  .cy-nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 6vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .cy-nav-name {
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px; color: var(--accent);
    letter-spacing: 0.08em;
  }
  .cy-nav-links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 16px; }
  .cy-nav-link {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; color: var(--muted);
    text-decoration: none; letter-spacing: 0.1em;
    text-transform: uppercase; transition: color 0.2s;
  }
  .cy-nav-link:hover { color: var(--accent); }

  .cy-body { padding: 0 6vw; max-width: 1000px; margin: 0 auto; }

  /* Hero */
  .cy-hero {
    padding: 48px 0 36px;
    border-bottom: 1px solid var(--border);
  }
  .cy-hero-name {
    font-size: clamp(22px, 3.5vw, 40px);
    font-weight: 700; color: var(--text);
    margin-bottom: 4px; line-height: 1.2;
  }
  .cy-hero-role {
    font-family: 'Share Tech Mono', monospace;
    font-size: 13px; color: var(--accent);
    margin-bottom: 10px; letter-spacing: 0.06em;
  }
  .cy-hero-certs { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
  .cy-cert-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; padding: 3px 10px;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 3px; color: var(--accent);
    letter-spacing: 0.08em;
  }
  .cy-hero-meta { display: flex; gap: 16px; flex-wrap: wrap; }
  .cy-hero-meta-item {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; color: var(--muted);
  }
  .cy-hero-meta-item a { color: var(--accent); text-decoration: none; }
  .cy-hero-meta-item a:hover { text-decoration: underline; }

  /* Section */
  .cy-section {
    padding: 36px 0;
    border-bottom: 1px solid var(--border);
  }
  .cy-section-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--accent);
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .cy-section-label::before { content: '//'; color: var(--muted); }
  .cy-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* Certs section */
  .cy-cert-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .cy-cert-card {
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 6px; padding: 16px;
    transition: box-shadow 0.2s;
  }
  .cy-cert-card:hover { box-shadow: 0 0 12px rgba(74,222,128,0.15); }
  .cy-cert-name {
    font-family: 'Share Tech Mono', monospace;
    font-size: 13px; color: var(--accent);
    margin-bottom: 4px; letter-spacing: 0.04em;
  }
  .cy-cert-meta { font-size: 11px; color: var(--muted); }

  /* Skills */
  .cy-skills-groups { display: flex; flex-direction: column; gap: 16px; }
  .cy-skill-group {}
  .cy-skill-cat {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; color: var(--accent);
    letter-spacing: 0.14em; text-transform: uppercase;
    margin-bottom: 8px;
  }
  .cy-skill-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .cy-skill-pill {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; padding: 4px 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
    transition: all 0.15s;
  }
  .cy-skill-pill:hover { border-color: var(--accent); color: var(--accent); }

  /* Projects */
  .cy-projects { display: flex; flex-direction: column; gap: 12px; }
  .cy-proj-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 20px;
    transition: border-color 0.2s;
  }
  .cy-proj-card:hover { border-color: var(--accent); }
  .cy-proj-img { width: 100%; aspect-ratio: 16/7; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 14px; }
  .cy-proj-name {
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px; color: var(--accent); margin-bottom: 6px;
  }
  .cy-proj-outcome {
    font-size: 13px; font-weight: 600;
    color: var(--text);
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: 4px; padding: 5px 10px;
    margin-bottom: 8px; display: inline-block;
  }
  .cy-proj-desc { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 10px; }
  .cy-proj-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .cy-proj-tag {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; padding: 2px 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 2px; color: var(--muted);
  }
  .cy-proj-link {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; color: var(--accent);
    text-decoration: none; transition: opacity 0.15s;
    display: inline-block; margin-top: 8px;
  }
  .cy-proj-link:hover { opacity: 0.7; }

  /* Experience */
  .cy-exp-list { display: flex; flex-direction: column; gap: 24px; }
  .cy-exp-item { padding-left: 18px; border-left: 2px solid var(--primary); position: relative; }
  .cy-exp-dot { position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .cy-exp-role { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .cy-exp-co { font-family: 'Share Tech Mono', monospace; font-size: 12px; color: var(--accent); margin-bottom: 2px; }
  .cy-exp-period { font-size: 11px; color: var(--muted); margin-bottom: 8px; }
  .cy-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .cy-exp-bullet { font-size: 13px; color: var(--muted); line-height: 1.6; display: flex; gap: 8px; }
  .cy-bullet-mark { color: var(--accent); flex-shrink: 0; }

  /* Contact */
  .cy-contact { padding: 36px 0 56px; }
  .cy-contact-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: var(--accent);
    color: var(--bg); border-radius: 4px;
    font-weight: 700; font-size: 14px; text-decoration: none;
    transition: opacity 0.2s;
    font-family: 'Share Tech Mono', monospace;
  }
  .cy-contact-cta:hover { opacity: 0.85; }
  .cy-contact-meta { font-size: 13px; color: var(--muted); margin-top: 12px; }
  .cy-contact-meta a { color: var(--accent); text-decoration: none; }

  .cy-footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 14px 6vw;
    display: flex; justify-content: space-between;
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; color: var(--muted);
  }
  .cy-footer a { color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .cy-footer a:hover { color: var(--accent); }

  /* Mobile hamburger */
  .cy-hamburger {
    display: none;
    background: none; border: none;
    cursor: pointer; padding: 4px;
    color: var(--accent);
    font-family: 'Share Tech Mono', monospace;
    font-size: 18px;
  }
  .cy-mobile-menu {
    display: none;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 6vw;
    flex-direction: column; gap: 2px;
  }
  .cy-mobile-menu-link {
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px; color: var(--muted);
    text-decoration: none; letter-spacing: 0.1em;
    text-transform: uppercase; transition: color 0.2s;
    padding: 8px 0;
    border-bottom: 1px solid rgba(22,101,52,0.3);
    display: block;
  }
  .cy-mobile-menu-link:last-child { border-bottom: none; }
  .cy-mobile-menu-link::before { content: '// '; color: var(--muted); opacity: 0.6; }
  .cy-mobile-menu-link:hover { color: var(--accent); }

  /* Education */
  .cy-edu-list { display: flex; flex-direction: column; gap: 16px; }
  .cy-edu-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 16px 20px;
    transition: border-color 0.2s;
  }
  .cy-edu-item:hover { border-color: var(--accent); }
  .cy-edu-degree {
    font-family: 'Share Tech Mono', monospace;
    font-size: 13px; color: var(--accent);
    margin-bottom: 4px; letter-spacing: 0.04em;
  }
  .cy-edu-institution { font-size: 12px; color: var(--text); margin-bottom: 2px; }
  .cy-edu-year { font-size: 11px; color: var(--muted); }

  @media (max-width: 700px) {
    .cy-hero { grid-template-columns: 1fr; }
    .cy-nav-links { display: none; }
    .cy-hamburger { display: block; }
    .cy-mobile-menu.open { display: flex; }
    .cy-cert-cards { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cy-root *, .cy-root *::before, .cy-root *::after { animation: none !important; transition: none !important; }
  }
`

export default function Cybersecurity({ content }: { content: PortfolioContent }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuId = useId()
  const certs = content.certifications ?? []
  const skillGroups = (content.skills_grouped ?? []).filter(g => g.items?.length > 0)
  const groupedSkills = new Set(skillGroups.flatMap(g => g.items))
  const ungroupedSkills = content.skills.filter(skill => !groupedSkills.has(skill))
  const hasSkills = skillGroups.length > 0 || ungroupedSkills.length > 0 || !!content.skills_narrative
  const hasContact = !!(content.email || content.github_url || content.linkedin_url)
  const navLinks = [
    { id: 'certs', label: 'Certs', show: certs.length > 0 },
    { id: 'skills', label: 'Skills', show: hasSkills },
    { id: 'projects', label: 'Projects', show: content.projects.length > 0 },
    { id: 'experience', label: 'Experience', show: content.experience.length > 0 },
    { id: 'education', label: 'Education', show: !!content.education?.length },
    { id: 'testimonials', label: 'Testimonials', show: !!content.testimonials?.length },
    { id: 'contact', label: 'Contact', show: hasContact },
  ].filter(link => link.show)

  return (
    <div className="cy-root">
      <style>{css}</style>

      <nav className="cy-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="cy-nav-links">
          {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="cy-nav-link">{link.label}</a>)}
        </div>
        {navLinks.length > 0 && <button
          type="button"
          className="cy-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls={menuId}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>}
      </nav>
      <div id={menuId} className={`cy-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
        {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="cy-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>{link.label}</a>)}
      </div>

      <div className="cy-body">
        {/* Hero */}
        <div className="cy-hero">
          <div>
            <h1 className="cy-hero-name">{content.name}</h1>
            <div className="cy-hero-role">{content.role}</div>
            {content.headline && <p className="cy-prose">{content.headline}</p>}
            {content.about && <p className="cy-prose">{content.about}</p>}
            {certs.length > 0 && (
              <div className="cy-hero-certs">
                {certs.map((c) => <span key={c} className="cy-cert-badge">{c}</span>)}
              </div>
            )}
            <div className="cy-hero-meta">
              {content.location && <span className="cy-hero-meta-item">{content.location}</span>}
              {content.email && <span className="cy-hero-meta-item"><a href={`mailto:${content.email}`}>{content.email}</a></span>}
              {content.github_url && <span className="cy-hero-meta-item"><a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a></span>}
              {content.linkedin_url && <span className="cy-hero-meta-item"><a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a></span>}
            </div>
          </div>
        </div>

        {/* Certs */}
        {certs.length > 0 && (
          <section id="certs" className="cy-section">
            <h2 className="cy-section-label">Certifications</h2>
            <div className="cy-cert-cards">
              {certs.map((c) => (
                <div key={c} className="cy-cert-card">
                  <div className="cy-cert-name">{c}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {hasSkills && (
          <section id="skills" className="cy-section">
            <h2 className="cy-section-label">Skills</h2>
            {content.skills_narrative && <p className="cy-prose">{content.skills_narrative}</p>}
            <div className="cy-skills-groups">
              {skillGroups.map(({ category, items }, i) => (
                <div key={i} className="cy-skill-group">
                  <h3 className="cy-skill-cat">{category}</h3>
                  <div className="cy-skill-pills">
                    {items.map((s) => <span key={s} className="cy-skill-pill">{s}</span>)}
                  </div>
                </div>
              ))}
              {ungroupedSkills.length > 0 && <div className="cy-skill-pills">
                {ungroupedSkills.map((s) => <span key={s} className="cy-skill-pill">{s}</span>)}
              </div>}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects.length > 0 && (
          <section id="projects" className="cy-section">
            <h2 className="cy-section-label">Projects</h2>
            <div className="cy-projects">
              {content.projects.map((p, i) => (
                <div key={i} className="cy-proj-card">
                  {p.image_url && !failedImages.has(p.image_url) && (
                  <Image src={p.image_url} alt={p.title} width={800} height={350} className="cy-proj-img"
                    onError={() => setFailedImages((prev) => new Set([...prev, p.image_url!]))} />
                )}
                  <div className="cy-proj-name">{p.title}</div>
                  {p.outcome && <div className="cy-proj-outcome">{p.outcome}</div>}
                  <div className="cy-proj-desc">
                    {p.problem && <span>{p.problem} </span>}
                    {p.solution && <span>{p.solution}</span>}
                  </div>
                  {p.stack.length > 0 && (
                    <div className="cy-proj-tags">
                      {p.stack.map((t) => <span key={t} className="cy-proj-tag">{t}</span>)}
                    </div>
                  )}
                  {(p.url || p.github_url) && <div className="cy-project-links">
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="cy-proj-link">View demo →</a>}
                    {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="cy-proj-link">Repository →</a>}
                  </div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {content.experience.length > 0 && (
          <section id="experience" className="cy-section">
            <h2 className="cy-section-label">Experience</h2>
            <div className="cy-exp-list">
              {content.experience.map((e, i) => (
                <div key={i} className="cy-exp-item">
                  <div className="cy-exp-dot" />
                  <div className="cy-exp-role">{e.role}</div>
                  <div className="cy-exp-co">{e.company}</div>
                  <div className="cy-exp-period">{e.period}</div>
                  {e.bullets.length > 0 && (
                    <ul className="cy-exp-bullets">
                      {e.bullets.map((b, j) => (
                        <li key={j} className="cy-exp-bullet">
                          <span className="cy-bullet-mark">▸</span><span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {content.education && content.education.length > 0 && (
          <section id="education" className="cy-section">
            <h2 className="cy-section-label">Education</h2>
            <div className="cy-edu-list">
              {content.education.map((ed, i) => (
                <div key={i} className="cy-edu-item">
                  <div className="cy-edu-degree">{ed.degree}</div>
                  <div className="cy-edu-institution">{ed.institution}</div>
                  <div className="cy-edu-year">{ed.year || (ed as typeof ed & { period?: string }).period}{ed.grade ? ` · ${ed.grade}` : ''}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {content.testimonials && content.testimonials.length > 0 && (
          <section id="testimonials" className="cy-section">
            <h2 className="cy-section-label">Testimonials</h2>
            <div className="cy-exp-list">
              {content.testimonials.map((testimonial, i) => (
                <figure key={i} className="cy-edu-item">
                  <blockquote className="cy-prose">{testimonial.text}</blockquote>
                  <figcaption>{[testimonial.author, testimonial.role, testimonial.company].filter(Boolean).join(' · ')}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {hasContact && <section id="contact" className="cy-contact">
          <h2 className="cy-section-label">Contact</h2>
          {content.email && <a href={`mailto:${content.email}`} className="cy-contact-cta">Get in touch →</a>}
          <div className="cy-contact-meta cy-project-links">
            {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a>}
            {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a>}
            {content.location && <span>{content.location}</span>}
          </div>
        </section>}
      </div>

      <footer className="cy-footer">
        <span>{`// ${content.name}`}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
