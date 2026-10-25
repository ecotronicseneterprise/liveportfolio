'use client'

import Image from 'next/image'
import { useId, useState } from 'react'
import type { PortfolioContent } from './Minimal'
import './template-fonts.css' // self-hosted fonts (no request to Google Fonts)

const css = `
  .gr-root {
    --bg: #EEF2FF;
    --surface: #FFFFFF;
    --primary: #4F46E5;
    --accent: #A5B4FC;
    --text: #1E1B4B;
    --muted: #6B7280;
    --border: #C7D2FE;
    background: var(--bg);
    color: var(--text);
    font-family: 'Nunito', system-ui, sans-serif;
    min-height: 100vh;
    overflow-wrap: anywhere;
  }
  .gr-root section[id] { scroll-margin-top: 80px; }
  .gr-root a:focus-visible, .gr-root button:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
  .gr-prose { white-space: pre-line; font-size: 15px; line-height: 1.7; margin-bottom: 16px; }
  .gr-project-links { display: flex; flex-wrap: wrap; gap: 16px; }
  .gr-skill-group { margin-bottom: 20px; }
  .gr-skill-category { font-weight: 700; margin-bottom: 8px; }
  .gr-nav {
    background: rgba(238,242,255,0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    padding: 14px 7vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .gr-nav-name { font-size: 15px; font-weight: 800; color: var(--primary); }
  .gr-nav-links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 16px; }
  .gr-nav-link { font-size: 13px; color: var(--muted); text-decoration: none; font-weight: 600; transition: color 0.2s; }
  .gr-nav-link:hover { color: var(--primary); }

  /* Hero */
  .gr-hero {
    padding: 56px 7vw 48px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 32px; align-items: start;
  }
  .gr-avatar {
    width: 100px; height: 100px; border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--primary);
    box-shadow: 0 0 0 6px rgba(79,70,229,0.1);
  }
  .gr-avatar-ph {
    width: 100px; height: 100px; border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    display: flex; align-items: center; justify-content: center;
    font-size: 36px; color: white;
    border: 3px solid var(--primary);
    box-shadow: 0 0 0 6px rgba(79,70,229,0.1);
  }
  .gr-hero-name {
    font-size: clamp(28px, 4.5vw, 52px);
    font-weight: 900; line-height: 1.1;
    color: var(--text); margin-bottom: 6px;
  }
  .gr-hero-role {
    font-size: 16px; font-weight: 700;
    color: var(--primary); margin-bottom: 10px;
  }
  .gr-hero-bio {
    font-size: 15px; color: var(--muted);
    line-height: 1.7; max-width: 540px;
    margin-bottom: 20px; font-weight: 500;
  }
  .gr-hero-links { display: flex; gap: 10px; flex-wrap: wrap; }
  .gr-cta {
    padding: 10px 20px;
    background: var(--primary); color: white;
    border-radius: 50px; font-size: 14px;
    font-weight: 700; text-decoration: none;
    transition: background 0.2s;
  }
  .gr-cta:hover { background: #4338CA; }
  .gr-cta-ghost {
    padding: 9px 18px;
    border: 2px solid var(--border); color: var(--primary);
    border-radius: 50px; font-size: 14px;
    font-weight: 600; text-decoration: none;
    transition: all 0.2s;
  }
  .gr-cta-ghost:hover { border-color: var(--primary); }

  /* Section */
  .gr-section {
    padding: 48px 7vw;
    border-bottom: 1px solid var(--border);
  }
  .gr-section-eyebrow {
    font-size: 11px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--primary);
    font-weight: 800; margin-bottom: 6px;
  }
  .gr-section-title {
    font-size: 26px; font-weight: 900;
    color: var(--text); margin-bottom: 28px;
  }

  /* Education */
  .gr-edu-list { display: flex; flex-direction: column; gap: 20px; }
  .gr-edu-card {
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px; padding: 24px;
    transition: border-color 0.2s;
  }
  .gr-edu-card:hover { border-color: var(--primary); }
  .gr-edu-degree { font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .gr-edu-institution { font-size: 14px; color: var(--primary); font-weight: 700; margin-bottom: 4px; }
  .gr-edu-meta { font-size: 12px; color: var(--muted); font-weight: 500; }

  /* Experience */
  .gr-exp-list { display: flex; flex-direction: column; gap: 24px; }
  .gr-exp-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px; padding: 20px 24px;
    border-left: 4px solid var(--accent);
    transition: border-left-color 0.2s;
  }
  .gr-exp-item:hover { border-left-color: var(--primary); }
  .gr-exp-role { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 2px; }
  .gr-exp-co { font-size: 13px; color: var(--primary); font-weight: 700; margin-bottom: 2px; }
  .gr-exp-period { font-size: 11px; color: var(--muted); margin-bottom: 10px; font-weight: 500; }
  .gr-exp-bullets { list-style: none; display: flex; flex-direction: column; gap: 5px; }
  .gr-exp-bullet { font-size: 13px; color: var(--muted); line-height: 1.6; display: flex; gap: 8px; font-weight: 500; }
  .gr-bullet-mark { color: var(--primary); flex-shrink: 0; }

  /* Projects */
  .gr-projects { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .gr-proj-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .gr-proj-card:hover { box-shadow: 0 8px 24px rgba(79,70,229,0.1); }
  .gr-proj-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .gr-proj-body { padding: 18px; }
  .gr-proj-name { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
  .gr-proj-built { font-size: 12px; color: var(--muted); line-height: 1.6; margin-bottom: 8px; font-weight: 500; }
  .gr-proj-outcome {
    font-size: 12px; color: var(--primary); font-weight: 700;
    background: rgba(79,70,229,0.06);
    border: 1px solid var(--border); border-radius: 6px;
    padding: 4px 10px; display: inline-block; margin-bottom: 8px;
  }
  .gr-proj-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .gr-proj-tag {
    font-size: 11px; padding: 3px 9px;
    background: rgba(165,180,252,0.15);
    border: 1px solid var(--border);
    border-radius: 50px; color: var(--primary); font-weight: 600;
  }
  .gr-proj-link { font-size: 12px; color: var(--primary); text-decoration: none; font-weight: 700; display: inline-block; margin-top: 6px; }

  /* Skills */
  .gr-skills { display: flex; flex-wrap: wrap; gap: 8px; }
  .gr-skill {
    font-size: 13px; padding: 6px 16px;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 50px; color: var(--primary);
    font-weight: 700; transition: all 0.15s;
  }
  .gr-skill:hover { border-color: var(--primary); background: rgba(79,70,229,0.05); }

  /* Contact */
  .gr-contact {
    padding: 56px 7vw 64px;
    background: linear-gradient(135deg, rgba(79,70,229,0.06), rgba(165,180,252,0.1));
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .gr-contact-title { font-size: 32px; font-weight: 900; color: var(--text); margin-bottom: 10px; }
  .gr-contact-sub { font-size: 15px; color: var(--muted); margin-bottom: 28px; font-weight: 500; }
  .gr-contact-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px; background: var(--primary);
    color: white; border-radius: 50px;
    font-size: 15px; font-weight: 800;
    text-decoration: none; transition: background 0.2s;
  }
  .gr-contact-cta:hover { background: #4338CA; }
  .gr-footer {
    padding: 16px 7vw;
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--muted); font-weight: 500;
    border-top: 1px solid var(--border);
  }
  .gr-footer a { color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .gr-footer a:hover { color: var(--primary); }

  .gr-hamburger { display: none; background: none; border: none; color: var(--primary); padding: 8px; font-size: 18px; cursor: pointer; }
  .gr-mobile-menu { display: none; background: var(--bg); padding: 12px 7vw; }
  .gr-mobile-menu a { padding: 8px 0; }

  @media (max-width: 700px) {
    .gr-hero { grid-template-columns: 1fr; }
    .gr-projects { grid-template-columns: 1fr; }
    .gr-nav-links { display: none; }
    .gr-hamburger { display: block; }
    .gr-mobile-menu.open { display: flex; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gr-root *, .gr-root *::before, .gr-root *::after { animation: none !important; transition: none !important; }
  }
`

export default function Graduate({ content }: { content: PortfolioContent }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuId = useId()
  const skillGroups = (content.skills_grouped ?? []).filter(g => g.items?.length > 0)
  const groupedSkills = new Set(skillGroups.flatMap(g => g.items))
  const ungroupedSkills = content.skills.filter(skill => !groupedSkills.has(skill))
  const hasSkills = skillGroups.length > 0 || ungroupedSkills.length > 0 || !!content.skills_narrative
  const hasContact = !!(content.email || content.github_url || content.linkedin_url)
  const navLinks = [
    { id: 'education', label: 'Education', show: !!content.education?.length },
    { id: 'experience', label: 'Experience', show: content.experience.length > 0 },
    { id: 'projects', label: 'Projects', show: content.projects.length > 0 },
    { id: 'skills', label: 'Skills', show: hasSkills },
    { id: 'certifications', label: 'Certifications', show: !!content.certifications?.length },
    { id: 'testimonials', label: 'Testimonials', show: !!content.testimonials?.length },
    { id: 'contact', label: 'Contact', show: hasContact },
  ].filter(link => link.show)

  return (
    <div className="gr-root">
      <style>{css}</style>

      <nav className="gr-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="gr-nav-links">
          {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="gr-nav-link">{link.label}</a>)}
        </div>
        {navLinks.length > 0 && <button type="button" className="gr-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen} aria-controls={menuId}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>}
      </nav>
      <div id={menuId} className={`gr-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
        {navLinks.map(link => <a key={link.id} href={`#${link.id}`} className="gr-nav-link" onClick={() => setMobileMenuOpen(false)}>{link.label}</a>)}
      </div>

      {/* Hero */}
      <div className="gr-hero">
        {content.avatar_url ? (
          <Image src={content.avatar_url} alt={content.name} width={100} height={100} className="gr-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div className="gr-avatar-ph" style={{ fontSize: 36, fontWeight: 600, color: '#fff', background: 'var(--primary)' }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="gr-hero-name">{content.name}</h1>
          <div className="gr-hero-role">{content.role}</div>
          {content.headline && <p className="gr-hero-bio">{content.headline}</p>}
          {content.about && <p className="gr-hero-bio gr-prose">{content.about}</p>}
          {content.location && <p className="gr-hero-bio">{content.location}</p>}
          <div className="gr-hero-links">
            {content.email && <a href={`mailto:${content.email}`} className="gr-cta">{content.email}</a>}
            {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">LinkedIn</a>}
            {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">GitHub</a>}
          </div>
        </div>
      </div>

      {/* Education first and prominent */}
      {content.education && content.education.length > 0 && <section id="education" className="gr-section">
        <div className="gr-section-eyebrow">Academic Background</div>
        <h2 className="gr-section-title">Education</h2>
        <div className="gr-edu-list">
          {content.education.map((ed, i) => (
            <div key={`edu-${i}`} className="gr-edu-card">
              <div className="gr-edu-degree">{ed.degree}</div>
              <div className="gr-edu-institution">{ed.institution}</div>
              <div className="gr-edu-meta">{ed.year || (ed as typeof ed & { period?: string }).period}{ed.grade ? ` · ${ed.grade}` : ''}</div>
            </div>
          ))}
        </div>
      </section>}

      {/* Experience */}
      {content.experience.length > 0 && (
        <section id="experience" className="gr-section">
          <div className="gr-section-eyebrow">Work History</div>
          <h2 className="gr-section-title">Experience</h2>
          <div className="gr-exp-list">
            {content.experience.map((e, i) => (
              <div key={i} className="gr-exp-item">
                <div className="gr-exp-role">{e.role}</div>
                <div className="gr-exp-co">{e.company}</div>
                <div className="gr-exp-period">{e.period}</div>
                {e.bullets.length > 0 && (
                  <ul className="gr-exp-bullets">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="gr-exp-bullet">
                        <span className="gr-bullet-mark">✦</span><span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {content.projects.length > 0 && (
        <section id="projects" className="gr-section">
          <h2 className="gr-section-title">Projects</h2>
          <div className="gr-projects">
            {content.projects.map((p, i) => (
              <div key={i} className="gr-proj-card">
                {p.image_url && !failedImages.has(p.image_url) && (
                  <Image src={p.image_url} alt={p.title} width={640} height={360} className="gr-proj-img"
                    onError={() => setFailedImages((prev) => new Set([...prev, p.image_url!]))} />
                )}
                <div className="gr-proj-body">
                  <div className="gr-proj-name">{p.title}</div>
                  {p.outcome && <div className="gr-proj-outcome">{p.outcome}</div>}
                  <div className="gr-proj-built">
                    {p.problem && <span>{p.problem} </span>}
                    {p.solution && <span>{p.solution}</span>}
                  </div>
                  {p.stack.length > 0 && (
                    <div className="gr-proj-tags">
                      {p.stack.map((t) => <span key={t} className="gr-proj-tag">{t}</span>)}
                    </div>
                  )}
                  {(p.url || p.github_url) && <div className="gr-project-links">
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="gr-proj-link">View demo →</a>}
                    {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="gr-proj-link">Repository →</a>}
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {hasSkills && (
        <section id="skills" className="gr-section">
          <div className="gr-section-eyebrow">Toolkit</div>
          <h2 className="gr-section-title">Skills</h2>
          {content.skills_narrative && <p className="gr-prose">{content.skills_narrative}</p>}
          {skillGroups.map(({ category, items }, i) => (
            <div key={i} className="gr-skill-group">
              <h3 className="gr-skill-category">{category}</h3>
              <div className="gr-skills">
                {items.map(s => <span key={s} className="gr-skill">{s}</span>)}
              </div>
            </div>
          ))}
          {ungroupedSkills.length > 0 && <div className="gr-skills">
            {ungroupedSkills.map(s => <span key={s} className="gr-skill">{s}</span>)}
          </div>}
        </section>
      )}

      {content.certifications && content.certifications.length > 0 && (
        <section id="certifications" className="gr-section">
          <h2 className="gr-section-title">Certifications</h2>
          <div className="gr-skills">
            {content.certifications.map(cert => <span key={cert} className="gr-skill">{cert}</span>)}
          </div>
        </section>
      )}

      {content.testimonials && content.testimonials.length > 0 && (
        <section id="testimonials" className="gr-section">
          <h2 className="gr-section-title">Testimonials</h2>
          <div className="gr-exp-list">
            {content.testimonials.map((testimonial, i) => (
              <figure key={i} className="gr-exp-item">
                <blockquote className="gr-prose">{testimonial.text}</blockquote>
                <figcaption>{[testimonial.author, testimonial.role, testimonial.company].filter(Boolean).join(' · ')}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      {hasContact && <section id="contact" className="gr-contact">
        <h2 className="gr-contact-title">Contact</h2>
        {content.email && <a href={`mailto:${content.email}`} className="gr-contact-cta">Get in touch →</a>}
        <div className="gr-hero-links" style={{ justifyContent: 'center', marginTop: 16 }}>
          {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">LinkedIn</a>}
          {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">GitHub</a>}
        </div>
      </section>}

      <footer className="gr-footer">
        <span>{content.name}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
