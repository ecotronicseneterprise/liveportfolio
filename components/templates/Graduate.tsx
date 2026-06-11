'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
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
  }
  .gr-nav {
    background: rgba(238,242,255,0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    padding: 14px 7vw;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .gr-nav-name { font-size: 15px; font-weight: 800; color: var(--primary); }
  .gr-nav-links { display: flex; gap: 22px; }
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
    opacity: 0; transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .gr-section.visible { opacity: 1; transform: none; }
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

  /* Experience — internship framing */
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

  @media (max-width: 700px) {
    .gr-hero { grid-template-columns: 1fr; }
    .gr-projects { grid-template-columns: 1fr; }
    .gr-nav-links { display: none; }
  }
`

export default function Graduate({ content }: { content: PortfolioContent }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll('.gr-section')
    if (!sections) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible') }),
      { threshold: 0.08 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="gr-root" ref={rootRef}>
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
          <a href="#education" className="gr-nav-link">Education</a>
          {content.experience.length > 0 && <a href="#experience" className="gr-nav-link">Experience</a>}
          {content.projects.length > 0 && <a href="#projects" className="gr-nav-link">Projects</a>}
          <a href="#contact" className="gr-nav-link">Contact</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="gr-hero">
        {content.avatar_url ? (
          <Image src={content.avatar_url} alt={content.name} width={100} height={100} className="gr-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div className="gr-avatar-ph">✦</div>
        )}
        <div>
          <h1 className="gr-hero-name">{content.name}</h1>
          <div className="gr-hero-role">{content.role}</div>
          <div className="gr-hero-bio">{content.headline}</div>
          <div className="gr-hero-links">
            <a href={`mailto:${content.email}`} className="gr-cta">Let&apos;s connect →</a>
            {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">LinkedIn</a>}
            {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="gr-cta-ghost">GitHub</a>}
          </div>
        </div>
      </div>

      {/* Education first and prominent */}
      <section id="education" className="gr-section">
        <div className="gr-section-eyebrow">Academic Background</div>
        <div className="gr-section-title">Education</div>
        <div className="gr-edu-list">
          {content.experience.filter(e =>
            /universit|college|school|degree|bsc|msc|ba |ma |phd|polytechnic|institute/i.test(e.company + ' ' + e.role)
          ).map((e, i) => (
            <div key={i} className="gr-edu-card">
              <div className="gr-edu-degree">{e.role}</div>
              <div className="gr-edu-institution">{e.company}</div>
              <div className="gr-edu-meta">{e.period}</div>
              {e.bullets.length > 0 && (
                <ul className="gr-exp-bullets" style={{ marginTop: 10 }}>
                  {e.bullets.map((b, j) => (
                    <li key={j} className="gr-exp-bullet">
                      <span className="gr-bullet-mark">✦</span><span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {/* If no education entries found in experience, show a placeholder */}
          {!content.experience.some(e =>
            /universit|college|school|degree|bsc|msc|ba |ma |phd|polytechnic|institute/i.test(e.company + ' ' + e.role)
          ) && (
            <div className="gr-edu-card">
              <div className="gr-edu-degree">Education details coming soon</div>
              <div className="gr-edu-institution">—</div>
            </div>
          )}
        </div>
      </section>

      {/* Experience / Internships */}
      {content.experience.filter(e =>
        !/universit|college|school|degree|bsc|msc|ba |ma |phd|polytechnic|institute/i.test(e.company + ' ' + e.role)
      ).length > 0 && (
        <section id="experience" className="gr-section">
          <div className="gr-section-eyebrow">Work History</div>
          <div className="gr-section-title">Internships &amp; Experience</div>
          <div className="gr-exp-list">
            {content.experience.filter(e =>
              !/universit|college|school|degree|bsc|msc|ba |ma |phd|polytechnic|institute/i.test(e.company + ' ' + e.role)
            ).map((e, i) => (
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
          <div className="gr-section-eyebrow">Personal Work</div>
          <div className="gr-section-title">Projects</div>
          <div className="gr-projects">
            {content.projects.map((p, i) => (
              <div key={i} className="gr-proj-card">
                {p.image_url && <Image src={p.image_url} alt={p.title} width={640} height={360} className="gr-proj-img" />}
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
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="gr-proj-link">View project →</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {content.skills.length > 0 && (
        <section className="gr-section">
          <div className="gr-section-eyebrow">Toolkit</div>
          <div className="gr-section-title">Skills</div>
          <div className="gr-skills">
            {content.skills.map((s) => <span key={s} className="gr-skill">{s}</span>)}
          </div>
        </section>
      )}

      {/* Contact */}
      <div id="contact" className="gr-contact">
        <h2 className="gr-contact-title">I&apos;m actively looking for opportunities.</h2>
        <p className="gr-contact-sub">Open to internships, entry-level roles, and graduate programmes.</p>
        <a href={`mailto:${content.email}`} className="gr-contact-cta">Get in touch →</a>
      </div>

      <footer className="gr-footer">
        <span>{content.name}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
