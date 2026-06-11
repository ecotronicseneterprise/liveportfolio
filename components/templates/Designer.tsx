'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  .ds-root {
    --bg: #F8FAFC;
    --surface: #FFFFFF;
    --primary: #6D28D9;
    --accent: #A78BFA;
    --text: #1E1B4B;
    --muted: #6B7280;
    --border: #E9D5FF;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 100vh;
  }
  .ds-nav {
    position: sticky; top: 0; z-index: 50;
    background: rgba(248,250,252,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 16px 7vw;
    display: flex; align-items: center; justify-content: space-between;
  }
  .ds-nav-name {
    font-family: 'Syne', sans-serif;
    font-size: 16px; font-weight: 700;
    color: var(--primary);
  }
  .ds-nav-links { display: flex; gap: 28px; }
  .ds-nav-link {
    font-size: 13px; color: var(--muted);
    text-decoration: none; transition: color 0.2s;
    font-weight: 500;
  }
  .ds-nav-link:hover { color: var(--primary); }

  /* Hero */
  .ds-hero {
    padding: 80px 7vw 64px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 48px;
    align-items: start;
    border-bottom: 1px solid var(--border);
  }
  .ds-hero-name {
    font-family: 'Syne', sans-serif;
    font-size: clamp(28px, 6vw, 76px);
    font-weight: 800;
    line-height: 1.0;
    letter-spacing: -0.03em;
    color: var(--text);
    margin-bottom: 12px;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
  }
  .ds-hero-role {
    font-family: 'DM Sans', sans-serif;
    font-size: 18px; font-weight: 400;
    color: var(--primary); margin-bottom: 20px;
  }
  .ds-hero-bio {
    font-size: 16px; line-height: 1.8;
    color: var(--muted); max-width: 560px;
    font-weight: 300; margin-bottom: 28px;
  }
  .ds-hero-links { display: flex; gap: 12px; flex-wrap: wrap; }
  .ds-cta-primary {
    padding: 11px 24px;
    background: var(--primary); color: white;
    border-radius: 50px; font-size: 14px;
    font-weight: 600; text-decoration: none;
    transition: background 0.2s;
  }
  .ds-cta-primary:hover { background: #5B21B6; }
  .ds-cta-ghost {
    padding: 10px 22px;
    border: 1.5px solid var(--border); color: var(--primary);
    border-radius: 50px; font-size: 14px;
    font-weight: 500; text-decoration: none;
    transition: all 0.2s;
  }
  .ds-cta-ghost:hover { border-color: var(--primary); background: rgba(109,40,217,0.04); }
  .ds-avatar-wrap {
    flex-shrink: 0;
  }
  .ds-avatar {
    width: 160px; height: 160px;
    border-radius: 20px;
    object-fit: cover;
    box-shadow: 0 16px 48px rgba(109,40,217,0.18);
  }
  .ds-avatar-placeholder {
    width: 160px; height: 160px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--border), var(--accent));
    display: flex; align-items: center; justify-content: center;
    font-size: 56px;
    box-shadow: 0 16px 48px rgba(109,40,217,0.18);
  }

  /* Section wrapper */
  .ds-section {
    padding: 64px 7vw;
    border-bottom: 1px solid var(--border);
    opacity: 0; transform: translateY(16px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .ds-section.visible { opacity: 1; transform: none; }
  .ds-section-eyebrow {
    font-family: 'Syne', sans-serif;
    font-size: 11px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--accent);
    font-weight: 600; margin-bottom: 8px;
  }
  .ds-section-title {
    font-family: 'Syne', sans-serif;
    font-size: 32px; font-weight: 700;
    color: var(--text); margin-bottom: 40px;
    line-height: 1.2;
  }

  /* Case studies */
  .ds-case-grid { display: flex; flex-direction: column; gap: 32px; }
  .ds-case-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .ds-case-card:hover { box-shadow: 0 12px 40px rgba(109,40,217,0.1); }
  .ds-case-img { width: 100%; aspect-ratio: 16/6; object-fit: cover; display: block; }
  .ds-case-body { padding: 32px; }
  .ds-case-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px; font-weight: 700;
    color: var(--text); margin-bottom: 12px;
  }
  .ds-case-problem { font-size: 14px; color: var(--muted); line-height: 1.7; margin-bottom: 12px; }
  .ds-case-outcome {
    font-size: 14px; font-weight: 600;
    color: var(--primary); margin-bottom: 16px;
    padding: 8px 14px;
    background: rgba(109,40,217,0.06);
    border-radius: 8px; display: inline-block;
  }
  .ds-case-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ds-case-tag {
    font-size: 11px; padding: 4px 12px;
    background: rgba(167,139,250,0.12);
    border: 1px solid var(--border);
    border-radius: 50px; color: var(--primary);
    font-weight: 500;
  }

  /* Process steps */
  .ds-process { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
  .ds-process-step {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px; padding: 24px;
    text-align: center;
  }
  .ds-process-num {
    font-family: 'Syne', sans-serif;
    font-size: 32px; font-weight: 800;
    color: var(--accent); margin-bottom: 8px;
  }
  .ds-process-label {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700;
    color: var(--text); margin-bottom: 6px;
  }
  .ds-process-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }

  /* Skills */
  .ds-skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .ds-skill {
    font-size: 13px; padding: 6px 16px;
    background: rgba(167,139,250,0.1);
    border: 1px solid var(--border);
    border-radius: 50px; color: var(--primary);
    font-weight: 500;
  }

  /* Testimonials */
  .ds-testimonials { display: flex; flex-direction: column; gap: 24px; }
  .ds-testimonial {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px; padding: 28px;
    position: relative;
  }
  .ds-testimonial::before {
    content: '"';
    font-family: 'Syne', sans-serif;
    font-size: 64px; color: var(--accent);
    position: absolute; top: 8px; left: 20px;
    line-height: 1; opacity: 0.3;
  }
  .ds-testimonial-text { font-size: 15px; color: var(--text); line-height: 1.8; font-style: italic; font-weight: 300; margin-bottom: 16px; padding-top: 24px; }
  .ds-testimonial-author { font-size: 13px; font-weight: 600; color: var(--primary); }
  .ds-testimonial-role { font-size: 12px; color: var(--muted); }

  /* Contact */
  .ds-contact {
    padding: 64px 7vw;
    text-align: center;
    background: linear-gradient(135deg, rgba(109,40,217,0.04), rgba(167,139,250,0.08));
  }
  .ds-contact-title {
    font-family: 'Syne', sans-serif;
    font-size: 40px; font-weight: 800;
    color: var(--text); margin-bottom: 12px;
  }
  .ds-contact-sub { font-size: 16px; color: var(--muted); margin-bottom: 32px; font-weight: 300; }
  .ds-contact-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px; background: var(--primary);
    color: white; border-radius: 50px; font-size: 15px;
    font-weight: 600; text-decoration: none; transition: background 0.2s;
  }
  .ds-contact-cta:hover { background: #5B21B6; }

  .ds-footer {
    padding: 20px 7vw;
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid var(--border);
    font-size: 12px; color: var(--muted);
  }
  .ds-footer a { color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .ds-footer a:hover { color: var(--primary); }

  @media (max-width: 700px) {
    .ds-hero { grid-template-columns: 1fr; }
    .ds-avatar-wrap { order: -1; }
    .ds-avatar, .ds-avatar-placeholder { width: 100px; height: 100px; }
    .ds-process { grid-template-columns: 1fr; }
    .ds-nav-links { display: none; }
    .ds-contact { padding: 48px 6vw; }
  }
`

export default function Designer({ content }: { content: PortfolioContent }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll('.ds-section')
    if (!sections) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible') }),
      { threshold: 0.08 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const works = content.projects

  return (
    <div className="ds-root" ref={rootRef}>
      <style>{css}</style>

      <nav className="ds-nav">
        {content.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {content.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="ds-nav-links">
          {works.length > 0 && <a href="#work" className="ds-nav-link">Work</a>}
          {content.skills.length > 0 && <a href="#skills" className="ds-nav-link">Skills</a>}
          {content.experience.length > 0 && <a href="#experience" className="ds-nav-link">Experience</a>}
          <a href="#contact" className="ds-nav-link">Contact</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="ds-hero">
        <div>
          <h1 className="ds-hero-name">{content.name}</h1>
          <p className="ds-hero-role">{content.role}</p>
          <p className="ds-hero-bio">{content.headline}</p>
          <div className="ds-hero-links">
            <a href={`mailto:${content.email}`} className="ds-cta-primary">Get in touch →</a>
            {content.linkedin_url && (
              <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="ds-cta-ghost">LinkedIn</a>
            )}
            {content.github_url && (
              <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="ds-cta-ghost">GitHub</a>
            )}
          </div>
        </div>
        <div className="ds-avatar-wrap">
          {content.avatar_url ? (
            <Image src={content.avatar_url} alt={content.name} width={160} height={160} className="ds-avatar" />
          ) : (
            <div className="ds-avatar-placeholder" style={{ fontSize: '48px', fontWeight: 600, fontFamily: 'sans-serif' }}>
              {content.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </section>

      {/* Work / Case Studies */}
      {works.length > 0 && (
        <section id="work" className="ds-section">
          <div className="ds-section-eyebrow">Selected Work</div>
          <div className="ds-section-title">Projects &amp; Case Studies</div>
          <div className="ds-case-grid">
            {works.map((p, i) => (
              <div key={i} className="ds-case-card">
                {p.image_url && (
                  <Image src={p.image_url} alt={p.title} width={1200} height={450} className="ds-case-img" />
                )}
                <div className="ds-case-body">
                  <div className="ds-case-title">{p.title}</div>
                  {p.problem && <div className="ds-case-problem">{p.problem}</div>}
                  {p.outcome && <div className="ds-case-outcome">{p.outcome}</div>}
                  {p.stack.length > 0 && (
                    <div className="ds-case-tags">
                      {p.stack.map((t) => <span key={t} className="ds-case-tag">{t}</span>)}
                    </div>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="ds-cta-ghost" style={{ display: 'inline-block', marginTop: 16 }}>
                      View project →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills.length > 0 && (
        <section id="skills" className="ds-section">
          <div className="ds-section-eyebrow">Toolkit</div>
          <div className="ds-section-title">Skills &amp; Tools</div>
          <div className="ds-skills-list">
            {content.skills.map((s) => <span key={s} className="ds-skill">{s}</span>)}
          </div>
        </section>
      )}

      {/* Experience */}
      {content.experience.length > 0 && (
        <section id="experience" className="ds-section">
          <div className="ds-section-eyebrow">Career</div>
          <div className="ds-section-title">Experience</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {content.experience.map((e, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 24, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -5, top: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>{e.role}</div>
                <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500, marginBottom: 2 }}>{e.company}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{e.period}</div>
                {e.bullets.length > 0 && (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {e.bullets.map((b, j) => (
                      <li key={j} style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>
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

      {/* Contact */}
      <div id="contact" className="ds-contact">
        <h2 className="ds-contact-title">Let&apos;s create something.</h2>
        <p className="ds-contact-sub">Open to full-time, freelance, and consulting engagements.</p>
        <a href={`mailto:${content.email}`} className="ds-contact-cta">Start a conversation →</a>
      </div>

      <footer className="ds-footer">
        <span>{content.name} · {content.role}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
