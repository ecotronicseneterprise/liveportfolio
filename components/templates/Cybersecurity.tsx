'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@300;400;500;600;700&display=swap');
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
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
  }

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
  .cy-nav-links { display: flex; gap: 24px; }
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
    display: grid; grid-template-columns: auto 1fr;
    gap: 32px; align-items: start;
  }
  .cy-avatar {
    width: 80px; height: 80px; border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--accent);
    box-shadow: 0 0 12px rgba(74,222,128,0.2);
  }
  .cy-avatar-ph {
    width: 80px; height: 80px; border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--accent);
    box-shadow: 0 0 12px rgba(74,222,128,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 30px; color: var(--accent);
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
    opacity: 0; transform: translateY(10px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .cy-section.visible { opacity: 1; transform: none; }
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

  @media (max-width: 700px) {
    .cy-hero { grid-template-columns: 1fr; }
    .cy-nav-links { display: none; }
    .cy-cert-cards { grid-template-columns: 1fr 1fr; }
  }
`

const OFFENSIVE_KEYWORDS = ['pentest', 'penetration', 'metasploit', 'burp suite', 'kali', 'nmap', 'exploit', 'red team', 'oscp', 'ctf', 'vulnerability', 'recon']
const DEFENSIVE_KEYWORDS = ['siem', 'splunk', 'wireshark', 'ids', 'ips', 'soc', 'incident response', 'threat hunting', 'firewall', 'dlp', 'endpoint', 'edr', 'xdr', 'blue team']
const COMPLIANCE_KEYWORDS = ['iso 27001', 'nist', 'gdpr', 'pci', 'hipaa', 'soc 2', 'cis', 'cobit', 'risk', 'audit', 'governance', 'compliance']
const SEC_LANG_KEYWORDS = ['python', 'bash', 'powershell', 'c ', 'c++', 'go', 'rust', 'assembly', 'scripting', 'regex']

function groupCyberSkills(skills: string[]) {
  const groups: Record<string, string[]> = { Offensive: [], Defensive: [], Compliance: [], Languages: [], Other: [] }
  for (const s of skills) {
    const sl = s.toLowerCase()
    if (OFFENSIVE_KEYWORDS.some((k) => sl.includes(k))) groups['Offensive'].push(s)
    else if (DEFENSIVE_KEYWORDS.some((k) => sl.includes(k))) groups['Defensive'].push(s)
    else if (COMPLIANCE_KEYWORDS.some((k) => sl.includes(k))) groups['Compliance'].push(s)
    else if (SEC_LANG_KEYWORDS.some((k) => sl.includes(k))) groups['Languages'].push(s)
    else groups['Other'].push(s)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

// Heuristic: cert names are typically all-caps or well-known cert names
const COMMON_CERTS = ['ceh', 'cissp', 'oscp', 'cism', 'crisc', 'cisa', 'comptia', 'security+', 'network+', 'aws', 'gcp', 'azure', 'ccna', 'ccnp', 'offensive security']

function extractCerts(skills: string[]): string[] {
  return skills.filter(s => {
    const sl = s.toLowerCase()
    return COMMON_CERTS.some((k) => sl.includes(k)) || /^[A-Z]{2,8}[\+]?$/.test(s.trim())
  })
}

export default function Cybersecurity({ content }: { content: PortfolioContent }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll('.cy-section')
    if (!sections) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible') }),
      { threshold: 0.08 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const certs = extractCerts(content.skills)
  const skillGroups: [string, string[]][] = content.skills_grouped?.length > 0
    ? content.skills_grouped.filter(g => g.items?.length > 0).map(g => [g.category, g.items])
    : groupCyberSkills(content.skills)

  return (
    <div className="cy-root" ref={rootRef}>
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
          {certs.length > 0 && <a href="#certs" className="cy-nav-link">Certs</a>}
          <a href="#skills" className="cy-nav-link">Skills</a>
          {content.projects.length > 0 && <a href="#projects" className="cy-nav-link">Projects</a>}
          {content.experience.length > 0 && <a href="#experience" className="cy-nav-link">Experience</a>}
          <a href="#contact" className="cy-nav-link">Contact</a>
        </div>
      </nav>

      <div className="cy-body">
        {/* Hero */}
        <div className="cy-hero">
          {content.avatar_url ? (
            <Image src={content.avatar_url} alt={content.name} width={80} height={80} className="cy-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="cy-avatar-ph" style={{ fontSize: 28, fontWeight: 600, color: '#fff', background: '#166534' }}>
              {content.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="cy-hero-name">{content.name}</div>
            <div className="cy-hero-role">{content.role}</div>
            {certs.length > 0 && (
              <div className="cy-hero-certs">
                {certs.map((c) => <span key={c} className="cy-cert-badge">{c}</span>)}
              </div>
            )}
            <div className="cy-hero-meta">
              {content.location && <span className="cy-hero-meta-item">{content.location}</span>}
              <span className="cy-hero-meta-item"><a href={`mailto:${content.email}`}>{content.email}</a></span>
              {content.github_url && <span className="cy-hero-meta-item"><a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a></span>}
              {content.linkedin_url && <span className="cy-hero-meta-item"><a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a></span>}
            </div>
          </div>
        </div>

        {/* Certs */}
        {certs.length > 0 && (
          <section id="certs" className="cy-section">
            <div className="cy-section-label">Certifications</div>
            <div className="cy-cert-cards">
              {certs.map((c) => (
                <div key={c} className="cy-cert-card">
                  <div className="cy-cert-name">{c}</div>
                  <div className="cy-cert-meta">Security certification</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {content.skills.length > 0 && (
          <section id="skills" className="cy-section">
            <div className="cy-section-label">Skills</div>
            <div className="cy-skills-groups">
              {skillGroups.map(([cat, items]) => (
                <div key={cat} className="cy-skill-group">
                  <div className="cy-skill-cat">{cat}</div>
                  <div className="cy-skill-pills">
                    {items.map((s) => <span key={s} className="cy-skill-pill">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects.length > 0 && (
          <section id="projects" className="cy-section">
            <div className="cy-section-label">Projects &amp; CTFs</div>
            <div className="cy-projects">
              {content.projects.map((p, i) => (
                <div key={i} className="cy-proj-card">
                  {p.image_url && <Image src={p.image_url} alt={p.title} width={800} height={350} className="cy-proj-img" />}
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
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="cy-proj-link">View →</a>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {content.experience.length > 0 && (
          <section id="experience" className="cy-section">
            <div className="cy-section-label">Experience</div>
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

        {/* Contact */}
        <section id="contact" className="cy-contact">
          <div className="cy-section-label">Contact</div>
          <a href={`mailto:${content.email}`} className="cy-contact-cta">Get in touch →</a>
          <div className="cy-contact-meta">
            Available for security consulting, penetration testing, and full-time roles.
            {content.location && <span> · {content.location}</span>}
          </div>
        </section>
      </div>

      <footer className="cy-footer">
        <span>{`// ${content.name}`}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
