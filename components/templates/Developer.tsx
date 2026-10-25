'use client'

import ContactIcons from '@/components/contact/ContactIcons'
import { contactItems } from '@/lib/contact/items'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'
import './template-fonts.css' // self-hosted fonts (no request to Google Fonts)

const css = `
  .dv-root {
    --bg: #1E293B;
    --surface: #0F172A;
    --primary: #2563EB;
    --accent: #60A5FA;
    --text: #F1F5F9;
    --muted: #A8B8CC;
    --border: #334155;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
  }
  .dv-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    min-height: 100vh;
  }
  .dv-sidebar {
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-right: 1px solid var(--border);
    padding: 32px 24px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .dv-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--primary);
    margin-bottom: 16px;
  }
  .dv-avatar-placeholder {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--border);
    border: 2px solid var(--primary);
    margin-bottom: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: var(--muted);
  }
  .dv-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
    line-height: 1.3;
    word-break: break-word;
  }
  .dv-role {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .dv-location { font-size: 11px; color: var(--muted); margin-bottom: 24px; }
  .dv-nav { display: flex; flex-direction: column; gap: 2px; margin-bottom: 24px; }
  .dv-nav-item {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    padding: 8px 10px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    transition: transform 150ms ease, color 150ms ease, background 150ms ease, border-color 150ms ease;
    cursor: pointer;
    background: none;
    border-top: none; border-right: none; border-bottom: none;
    border-left: 2px solid transparent;
    text-align: left;
    width: 100%;
  }
  .dv-nav-item:hover, .dv-nav-item.active {
    color: var(--accent);
    background: rgba(96,165,250,0.08);
    border-left-color: var(--accent);
    transform: translateX(4px);
  }
  .dv-links { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
  .dv-link {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: var(--muted);
    text-decoration: none; transition: color 0.15s;
    word-break: break-all;
  }
  .dv-link:hover { color: var(--accent); }
  .dv-link-icon { font-size: 13px; flex-shrink: 0; }
  .dv-footer-link { font-size: 10px; color: #64748B; text-decoration: none; margin-top: 16px; transition: color 0.15s; }
  .dv-footer-link:hover { color: var(--accent); }

  .dv-main { width: 100%; padding: 40px clamp(28px, 5vw, 72px); min-width: 0; }
  .dv-root { overflow-wrap: anywhere; }
  .dv-section { margin-bottom: 56px; scroll-margin-top: 80px; }
  .dv-root :focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .dv-root *, .dv-root *::before, .dv-root *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; transform: none !important; }
  }
  .dv-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .dv-section-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, rgba(96, 165, 250, 0.4), transparent); border: none; }
  .dv-headline {
    font-size: 40px; font-weight: 700;
    line-height: 1.3; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #F1F5F9 0%, #60A5FA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
  }
  .dv-about { font-size: 15px; color: var(--muted); line-height: 1.7; }
  .dv-about p { margin-bottom: 12px; }

  /* Skills */
  .dv-skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .dv-skill-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 5px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--muted);
    transition: all 150ms ease;
  }
  .dv-skill-pill:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: scale(1.05);
    background: linear-gradient(135deg, rgba(88,166,255,0.15), rgba(121,192,255,0.08));
  }
  .dv-skills-group { margin-bottom: 16px; }
  .dv-skills-cat {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: var(--accent);
    margin-bottom: 8px; letter-spacing: 0.1em;
  }

  /* Projects */
  .dv-projects-list { display: flex; flex-direction: column; gap: 16px; }
  .dv-project-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  }
  .dv-project-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  }
  .dv-project-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .dv-project-body { padding: 20px; }
  .dv-project-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px; font-weight: 700;
    color: var(--accent); margin-bottom: 6px;
  }
  .dv-project-outcome {
    font-size: 12px; color: var(--text);
    background: rgba(37, 99, 235, 0.08);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(96, 165, 250, 0.25);
    border-radius: 6px; padding: 6px 10px;
    margin-bottom: 10px; font-weight: 500;
  }
  .dv-project-desc { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 10px; }
  .dv-tag-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .dv-tech-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; padding: 2px 7px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
  }
  .dv-project-links { display: flex; gap: 10px; }
  .dv-project-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: var(--accent);
    text-decoration: none; transition: opacity 0.15s;
  }
  .dv-project-link:hover { opacity: 0.7; }

  /* Experience */
  .dv-exp-list { display: flex; flex-direction: column; gap: 28px; }
  .dv-exp-item { padding-left: 20px; border-left: 2px solid var(--primary); position: relative; }
  .dv-exp-dot {
    position: absolute; left: -5px; top: 4px;
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--primary);
  }
  .dv-exp-role { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .dv-exp-company { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent); margin-bottom: 2px; }
  .dv-exp-period { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
  .dv-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 5px; }
  .dv-exp-bullet { font-size: 15px; color: var(--muted); line-height: 1.7; display: flex; gap: 8px; }
  .dv-bullet-marker { color: var(--primary); flex-shrink: 0; }

  /* GitHub card */
  .dv-gh-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .dv-gh-text { font-size: 13px; color: var(--muted); }
  .dv-gh-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; padding: 8px 16px;
    background: var(--primary); color: white;
    border-radius: 6px; text-decoration: none;
    flex-shrink: 0; transition: background 0.15s;
  }
  .dv-gh-link:hover { background: var(--accent); }

  /* Contact */
  .dv-contact-email {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: var(--primary);
    color: white; border-radius: 6px; text-decoration: none;
    font-weight: 600; font-size: 14px; transition: background 0.15s;
    margin-bottom: 16px;
  }
  .dv-contact-email:hover { background: var(--accent); }
  .dv-contact-meta { font-size: 13px; color: var(--muted); }

  /* Mobile */
  .dv-mobile-nav {
    display: none;
    position: sticky; top: 0; z-index: 50;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 20px;
    justify-content: space-between; align-items: center;
  }
  .dv-mobile-name { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--accent); }
  .dv-mobile-toggle { background: none; border: none; color: var(--text); font-size: 18px; cursor: pointer; padding: 0; }
  .dv-mobile-menu { display: none; background: var(--surface); border-bottom: 1px solid var(--border); padding: 12px 20px; }
  .dv-mobile-menu.open { display: block; }
  .dv-mobile-menu a { display: block; padding: 8px 0; font-size: 14px; color: var(--muted); text-decoration: none; }

  .dv-mobile-name-hero { display: none; }
  @media (max-width: 768px) {
    .dv-layout { grid-template-columns: 1fr; }
    .dv-sidebar { display: none; }
    .dv-mobile-nav { display: flex; }
    .dv-main { padding: 24px 20px; }
    .dv-gh-card { flex-direction: column; align-items: flex-start; }
    .dv-mobile-name-hero { display: block; font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  }
`

export default function Developer({ content }: { content: PortfolioContent }) {
  const [activeSection, setActiveSection] = useState('about')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const mainRef = useRef<HTMLDivElement>(null)
  const skillGroups = content.skills_grouped?.filter(g => g.items?.length > 0) ?? []
  const groupedSkills = new Set(skillGroups.flatMap(g => g.items))
  const flatSkills = content.skills.filter(s => !groupedSkills.has(s))
  const hasSkills = !!(flatSkills.length || skillGroups.length || content.skills_narrative)
  const hasAbout = !!(content.headline || content.about)
  const hasContact = contactItems(content as unknown as Record<string, unknown>).length > 0

  const navItems = [
    ...(hasAbout ? [{ id: 'about', label: 'About' }] : []),
    ...(hasSkills ? [{ id: 'skills', label: 'Tech Stack' }] : []),
    ...(content.projects.length ? [{ id: 'projects', label: 'Projects' }] : []),
    ...(content.experience.length ? [{ id: 'experience', label: 'Experience' }] : []),
    ...(content.github_url ? [{ id: 'github', label: 'GitHub' }] : []),
    ...(content.education && content.education.length > 0 ? [{ id: 'education', label: 'Education' }] : []),
    ...(content.certifications && content.certifications.length > 0 ? [{ id: 'certifications', label: 'Certifications' }] : []),
    ...(content.testimonials?.length ? [{ id: 'testimonials', label: 'Testimonials' }] : []),
    ...(hasContact ? [{ id: 'contact', label: 'Contact' }] : []),
  ]

  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll('.dv-section')
    if (!sections || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (e.intersectionRatio > 0.3) setActiveSection(e.target.id)
          }
        })
      },
      { threshold: [0.1, 0.3] }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    setMobileOpen(false)
  }

  return (
    <div className="dv-root">
      <style>{css}</style>

      {/* Mobile nav */}
      <div className="dv-mobile-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <button type="button" className="dv-mobile-toggle" aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} aria-controls="dv-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>
      <nav id="dv-mobile-menu" aria-label="Mobile sections" className={`dv-mobile-menu${mobileOpen ? ' open' : ''}`}>
        {navItems.map((item) => (
          <a key={item.id} href={`#${item.id}`} onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="dv-layout">
        {/* Sidebar */}
        <aside className="dv-sidebar">
          {content.avatar_url ? (
            <Image src={content.avatar_url} alt={content.name} width={72} height={72} className="dv-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="dv-avatar-placeholder">◉</div>
          )}
          <div className="dv-name">{content.name}</div>
          <div className="dv-role">{content.role}</div>
          {content.location && <div className="dv-location">{content.location}</div>}

          <nav className="dv-nav">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`dv-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="dv-links">
            <ContactIcons className="lpc--stack" content={content as unknown as Record<string, unknown>} />
          </div>
          <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer" className="dv-footer-link">
            Built with liveportfolio.site
          </a>
        </aside>

        {/* Main */}
        <main className="dv-main" ref={mainRef}>
          <header style={{ marginBottom: 24 }}>
            <h1 className="dv-name">{content.name}</h1>
            {content.role && <p className="dv-role">{content.role}</p>}
            {content.location && <p className="dv-location">{content.location}</p>}
          </header>

          {/* About */}
          {hasAbout && <section id="about" className="dv-section">
            <h2 className="dv-section-label">About</h2>
            {content.headline && <p className="dv-headline">{content.headline}</p>}
            <div className="dv-about">
              {content.about.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>}

          {/* Tech Stack */}
          {hasSkills && (
            <section id="skills" className="dv-section">
              <h2 className="dv-section-label">Tech Stack</h2>
              {content.skills_narrative && <p className="dv-about" style={{ marginBottom: 16 }}>{content.skills_narrative}</p>}
              {skillGroups.map((g, i) => (
                  <div key={i} className="dv-skills-group">
                    <div className="dv-skills-cat">{g.category}</div>
                    <div className="dv-skills-grid">
                      {g.items.map((s) => <span key={s} className="dv-skill-pill">{s}</span>)}
                    </div>
                  </div>
                ))}
              {flatSkills.length > 0 && (
                <div className="dv-skills-grid">
                  {flatSkills.map((s) => <span key={s} className="dv-skill-pill">{s}</span>)}
                </div>
              )}
            </section>
          )}

          {/* Projects */}
          {content.projects.length > 0 && (
            <section id="projects" className="dv-section">
              <h2 className="dv-section-label">Projects</h2>
              <div className="dv-projects-list">
                {content.projects.map((p, i) => (
                  <div key={i} className="dv-project-card">
                    {p.image_url && !failedImages.has(p.image_url) && (
                      <Image src={p.image_url} alt={p.title} width={800} height={450} className="dv-project-img"
                        onError={() => setFailedImages((prev) => new Set([...prev, p.image_url!]))} />
                    )}
                    <div className="dv-project-body">
                      <div className="dv-project-name">{p.title}</div>
                      {p.outcome && <div className="dv-project-outcome">{p.outcome}</div>}
                      <div className="dv-project-desc">
                        {p.problem && <span>{p.problem} </span>}
                        {p.solution && <span>{p.solution}</span>}
                      </div>
                      {p.stack.length > 0 && (
                        <div className="dv-tag-row">
                          {p.stack.map((t) => <span key={t} className="dv-tech-tag">{t}</span>)}
                        </div>
                      )}
                      {(p.url || p.github_url) && (
                        <div className="dv-project-links">
                          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="dv-project-link">View project ↗</a>}
                          {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="dv-project-link">Repository ↗</a>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Experience */}
          {content.experience.length > 0 && (
            <section id="experience" className="dv-section">
              <h2 className="dv-section-label">Experience</h2>
              <div className="dv-exp-list">
                {content.experience.map((e, i) => (
                  <div key={i} className="dv-exp-item">
                    <div className="dv-exp-dot" />
                    <div className="dv-exp-role">{e.role}</div>
                    <div className="dv-exp-company">{e.company}</div>
                    <div className="dv-exp-period">{e.period}</div>
                    {e.bullets.length > 0 && (
                      <ul className="dv-exp-bullets">
                        {e.bullets.map((b, j) => (
                          <li key={j} className="dv-exp-bullet">
                            <span className="dv-bullet-marker">▸</span>
                            <span>{b}</span>
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
            <section id="github" className="dv-section">
              <h2 className="dv-section-label">GitHub</h2>
              <div className="dv-gh-card">
                <div className="dv-gh-text">
                  Explore my GitHub profile.
                </div>
                <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="dv-gh-link">
                  View GitHub →
                </a>
              </div>
            </section>
          )}

          {/* Education */}
          {content.education && content.education.length > 0 && (
            <section id="education" className="dv-section">
              <h2 className="dv-section-label">Education</h2>
              <div className="dv-exp-list">
                {content.education.map((ed, i) => (
                  <div key={i} className="dv-exp-item">
                    <div className="dv-exp-dot" />
                    <div className="dv-exp-role">{ed.degree}</div>
                    <div className="dv-exp-company">{ed.institution}</div>
                    <div className="dv-exp-period">{ed.year || (ed as typeof ed & { period?: string }).period}{ed.grade ? ` · ${ed.grade}` : ''}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {content.certifications && content.certifications.length > 0 && (
            <section id="certifications" className="dv-section">
              <h2 className="dv-section-label">Certifications</h2>
              <div className="dv-skills-grid">
                {content.certifications.map((cert) => (
                  <span key={cert} className="dv-skill-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>{cert}</span>
                ))}
              </div>
            </section>
          )}

          {/* Contact */}
          {!!content.testimonials?.length && (
            <section id="testimonials" className="dv-section">
              <h2 className="dv-section-label">Testimonials</h2>
              <div className="dv-exp-list">
                {content.testimonials.map((t, i) => (
                  <figure key={i} className="dv-project-body">
                    <blockquote className="dv-about">{t.text}</blockquote>
                    <figcaption className="dv-exp-company">{t.author}{t.role ? ` · ${t.role}` : ''}{t.company ? ` · ${t.company}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          {hasContact && <section id="contact" className="dv-section" style={{ marginBottom: 0 }}>
            <h2 className="dv-section-label">Contact</h2>
            <ContactIcons content={content as unknown as Record<string, unknown>} />
            <div className="dv-contact-meta">
              {content.location && <div>{content.location}</div>}
            </div>
          </section>}
        </main>
      </div>
    </div>
  )
}
