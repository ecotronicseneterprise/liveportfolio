'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  .sci-root {
    --bg: #134E4A;
    --surface: #0D3330;
    --primary: #0F766E;
    --accent: #2DD4BF;
    --text: #F0FDFA;
    --muted: #99F6E4;
    --border: #115E59;
    background: var(--bg);
    color: var(--text);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    min-height: 100vh;
  }
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
  .sci-nav-links { display: flex; gap: 24px; }
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
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 32px; align-items: center;
    padding: 48px 0 40px;
    border-bottom: 1px solid var(--border);
  }
  .sci-avatar {
    width: 80px; height: 80px; border-radius: 50%;
    object-fit: cover; border: 2px solid var(--accent);
  }
  .sci-avatar-ph {
    width: 80px; height: 80px; border-radius: 50%;
    background: var(--surface); border: 2px solid var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; color: var(--muted);
  }
  .sci-hero-name {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: clamp(24px, 3.5vw, 40px);
    font-weight: 600; color: var(--text);
    margin-bottom: 4px;
  }
  .sci-hero-role {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px; color: var(--accent);
    margin-bottom: 8px;
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
    opacity: 0; transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .sci-section.visible { opacity: 1; transform: none; }
  .sci-section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--accent);
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .sci-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  /* Skills Matrix */
  .sci-matrix { display: flex; flex-direction: column; gap: 16px; }
  .sci-matrix-group {}
  .sci-matrix-cat {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--accent);
    letter-spacing: 0.12em; text-transform: uppercase;
    margin-bottom: 8px;
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
    transition: border-color 0.2s;
  }
  .sci-proj-card:hover { border-color: var(--accent); }
  .sci-proj-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .sci-proj-body { padding: 20px; }
  .sci-proj-name {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px; font-weight: 600;
    color: var(--text); margin-bottom: 6px;
  }
  .sci-proj-outcome {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; color: var(--accent);
    background: rgba(45,212,191,0.08);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: 4px; padding: 5px 10px;
    margin-bottom: 10px;
  }
  .sci-proj-desc { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 10px; }
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
  .sci-exp-bullet { font-size: 13px; color: var(--muted); line-height: 1.6; display: flex; gap: 8px; }
  .sci-bullet-mark { color: var(--accent); flex-shrink: 0; }

  /* GitHub CTA */
  .sci-gh-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .sci-gh-text { font-size: 13px; color: var(--muted); }
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
  .sci-contact-meta { font-size: 13px; color: var(--muted); }
  .sci-contact-meta a { color: var(--accent); text-decoration: none; }
  .sci-footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 16px 6vw;
    display: flex; justify-content: space-between;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--muted);
  }
  .sci-footer a { color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .sci-footer a:hover { color: var(--accent); }

  @media (max-width: 700px) {
    .sci-projects { grid-template-columns: 1fr; }
    .sci-hero { grid-template-columns: 1fr; }
    .sci-nav-links { display: none; }
    .sci-gh-card { flex-direction: column; align-items: flex-start; }
  }
`

const LANG_KEYWORDS = ['python', 'r', 'sql', 'scala', 'julia', 'matlab', 'bash', 'java', 'c++', 'go', 'rust']
const ML_KEYWORDS = ['tensorflow', 'pytorch', 'scikit', 'keras', 'xgboost', 'lightgbm', 'huggingface', 'transformers', 'langchain', 'openai', 'llm', 'nlp', 'ml', 'ai', 'rag']
const TOOLS_KEYWORDS = ['tableau', 'power bi', 'jupyter', 'databricks', 'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'pandas', 'numpy', 'plotly', 'matplotlib', 'excel']
const CLOUD_KEYWORDS = ['aws', 'gcp', 'azure', 'google cloud', 'sagemaker', 'bigquery', 'snowflake', 'redshift', 'docker', 'kubernetes', 'mlflow', 'wandb']

function categoriseSkills(skills: string[]) {
  const groups: Record<string, string[]> = { Languages: [], 'ML / AI': [], Tools: [], Cloud: [], Other: [] }
  for (const s of skills) {
    const sl = s.toLowerCase()
    if (LANG_KEYWORDS.some((k) => sl.includes(k))) groups['Languages'].push(s)
    else if (ML_KEYWORDS.some((k) => sl.includes(k))) groups['ML / AI'].push(s)
    else if (TOOLS_KEYWORDS.some((k) => sl.includes(k))) groups['Tools'].push(s)
    else if (CLOUD_KEYWORDS.some((k) => sl.includes(k))) groups['Cloud'].push(s)
    else groups['Other'].push(s)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

export default function DataScientist({ content }: { content: PortfolioContent }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll('.sci-section')
    if (!sections) return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible') }),
      { threshold: 0.08 }
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  // Normalise to [cat, items[]] tuples regardless of source
  const grouped: [string, string[]][] = content.skills_grouped?.length > 0
    ? content.skills_grouped.filter(g => g.items?.length > 0).map(g => [g.category, g.items])
    : categoriseSkills(content.skills)

  return (
    <div className="sci-root" ref={rootRef}>
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
          <a href="#skills" className="sci-nav-link">Stack</a>
          <a href="#projects" className="sci-nav-link">Projects</a>
          {content.experience.length > 0 && <a href="#experience" className="sci-nav-link">Experience</a>}
          <a href="#contact" className="sci-nav-link">Contact</a>
        </div>
      </nav>

      <div className="sci-body">
        {/* Hero */}
        <div className="sci-hero">
          {content.avatar_url ? (
            <Image src={content.avatar_url} alt={content.name} width={80} height={80} className="sci-avatar" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="sci-avatar-ph">◉</div>
          )}
          <div>
            <div className="sci-hero-name">{content.name}</div>
            <div className="sci-hero-role">{content.role}</div>
            <div className="sci-hero-meta">
              {content.location && <span className="sci-hero-meta-item">{content.location}</span>}
              <span className="sci-hero-meta-item"><a href={`mailto:${content.email}`}>{content.email}</a></span>
              {content.github_url && <span className="sci-hero-meta-item"><a href={content.github_url} target="_blank" rel="noopener noreferrer">GitHub →</a></span>}
              {content.linkedin_url && <span className="sci-hero-meta-item"><a href={content.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn →</a></span>}
            </div>
          </div>
        </div>

        {/* Skills Matrix */}
        {content.skills.length > 0 && (
          <section id="skills" className="sci-section">
            <div className="sci-section-label">Skills Matrix</div>
            <div className="sci-matrix">
              {grouped.map(([cat, items]) => (
                <div key={cat} className="sci-matrix-group">
                  <div className="sci-matrix-cat">{cat}</div>
                  <div className="sci-matrix-pills">
                    {items.map((s) => <span key={s} className="sci-matrix-pill">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects.length > 0 && (
          <section id="projects" className="sci-section">
            <div className="sci-section-label">Projects</div>
            <div className="sci-projects">
              {content.projects.map((p, i) => (
                <div key={i} className="sci-proj-card">
                  {p.image_url && <Image src={p.image_url} alt={p.title} width={640} height={360} className="sci-proj-img" />}
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
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="sci-proj-link">View project ↗</a>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {content.experience.length > 0 && (
          <section id="experience" className="sci-section">
            <div className="sci-section-label">Experience</div>
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
            <div className="sci-section-label">Open Source</div>
            <div className="sci-gh-card">
              <div className="sci-gh-text">Notebooks, experiments, and open source projects on GitHub.</div>
              <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="sci-gh-link">View repositories →</a>
            </div>
          </section>
        )}

        {/* Contact */}
        <section id="contact" className="sci-contact">
          <div className="sci-section-label">Contact</div>
          <a href={`mailto:${content.email}`} className="sci-contact-cta">Get in touch →</a>
          <div className="sci-contact-meta">
            {content.location && <div>{content.location}</div>}
          </div>
        </section>
      </div>

      <footer className="sci-footer">
        <span>{content.name}</span>
        <a href="https://liveportfolio.site" target="_blank" rel="noopener noreferrer">liveportfolio.site</a>
      </footer>
    </div>
  )
}
