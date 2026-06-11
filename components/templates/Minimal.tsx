'use client'

import { Playfair_Display, DM_Sans } from 'next/font/google'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export interface PortfolioContent {
  name: string
  role: string
  headline: string
  about: string
  location: string
  email: string
  github_url?: string
  linkedin_url?: string
  avatar_url?: string
  skills: string[]
  skills_narrative: string
  skills_grouped: { category: string; items: string[] }[]
  projects: {
    title: string
    problem: string
    solution: string
    outcome: string
    stack: string[]
    url?: string
    image_url?: string
  }[]
  experience: {
    company: string
    role: string
    period: string
    bullets: string[]
  }[]
  education?: {
    degree: string
    institution: string
    year: string
    grade?: string
  }[]
  certifications?: string[]
  testimonials?: {
    text: string
    author: string
    role: string
    company?: string
  }[]
}

export default function Minimal({ content }: { content: PortfolioContent }) {
  const [expandedProject, setExpandedProject] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  const navLinks = ['About', 'Projects', 'Experience', 'Contact']

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set([...prev, entry.target.id]))
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('section[id]').forEach((s) => observerRef.current?.observe(s))
    return () => observerRef.current?.disconnect()
  }, [])

  const fadeIn = (id: string) =>
    `transition-all duration-700 ${visible.has(id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`

  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} min-h-screen bg-white text-[#0A0A0A]`}
      style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between">
          {content.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.avatar_url} alt={content.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {content.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="text-sm text-gray-500 hover:text-[#0A0A0A] transition-colors">
                {link}
              </a>
            ))}
          </div>
          <button className="sm:hidden p-1 text-gray-500" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 px-6 py-3 space-y-1 bg-white">
            {navLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-gray-600 hover:text-[#0A66C2] transition-colors">
                {link}
              </a>
            ))}
          </div>
        )}
      </nav>

      <main className="w-full">

        {/* Hero — full width, two-column on desktop */}
        <section className="w-full border-b border-gray-100">
          <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              {content.avatar_url ? (
                <Image src={content.avatar_url} alt={content.name} width={80} height={80} className="rounded-full object-cover object-top mb-6" />
              ) : (
                <div className="rounded-full mb-6 flex items-center justify-center flex-shrink-0" style={{ width: 80, height: 80, background: 'rgba(10,102,194,0.12)', color: '#0A66C2', fontSize: 30, fontWeight: 700 }}>
                  {content.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] break-words mb-4" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                {content.name}
              </h1>
              <div className="w-8 h-0.5 bg-[#0A66C2] my-4" />
              <p className="text-xl text-gray-500 mb-6">{content.role}</p>
              <div className="flex flex-wrap items-center gap-4">
                <a href={`mailto:${content.email}`} className="text-sm text-[#0A66C2] hover:underline font-medium">{content.email}</a>
                {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline font-medium">GitHub →</a>}
                {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline font-medium">LinkedIn →</a>}
                {content.location && <span className="text-sm text-gray-400">{content.location}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-8">
              <p className="text-xl sm:text-2xl leading-relaxed text-[#0A0A0A]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                {content.headline}
              </p>
              {content.about && (
                <div>
                  {content.about.split('\n\n').map((para, i) => (
                    <p key={i} className="text-base leading-relaxed text-gray-600 mb-4 last:mb-0">{para}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Skills */}
        {(content.skills.length > 0 || content.skills_grouped.length > 0) && (
          <section id="skills" className={`w-full border-b border-gray-100 ${fadeIn('skills')}`}>
            <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Skills</p>
              {content.skills_grouped.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-gray-100 rounded-2xl overflow-hidden">
                  {content.skills_grouped.filter(g => g.items && g.items.length > 0).map((group, i) => {
                    const total = content.skills_grouped.filter(g => g.items && g.items.length > 0).length
                    const cols = 4
                    const lastRowCount = total % cols
                    const isInLastRow = i >= total - (lastRowCount || cols)
                    const isLastOdd = lastRowCount !== 0 && i === total - 1
                    return (
                      <div key={i} className={`p-6 border-b border-gray-100${isLastOdd ? ' sm:col-span-2' : ''}${!isInLastRow || isLastOdd ? ' sm:border-b-0' : ''} sm:border-r last:border-r-0 last:border-b-0`}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{group.category}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((skill) => (
                            <span key={skill} className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-full text-gray-700">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {content.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full text-gray-700 hover:border-[#0A66C2] hover:text-[#0A66C2] transition-all">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Projects */}
        {content.projects.length > 0 && (
          <section id="projects" className={`w-full border-b border-gray-100 ${fadeIn('projects')}`}>
            <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Projects</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {content.projects.map((project, i) => (
                  <div
                    key={i}
                    className={`border border-gray-100 rounded-2xl overflow-hidden hover:border-[#0A66C2] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer${content.projects.length % 2 !== 0 && i === content.projects.length - 1 ? ' sm:col-span-2' : ''}`}
                    onClick={() => setExpandedProject(expandedProject === i ? null : i)}
                  >
                    {project.image_url && (
                      <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <Image src={project.image_url} alt={project.title} width={640} height={360} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-[#0A0A0A] flex-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>{project.title}</h3>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {project.url && (
                            <a href={project.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-[#0A66C2] hover:underline">View →</a>
                          )}
                          <span className="text-gray-300 text-xs">{expandedProject === i ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {project.stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {project.stack.slice(0, 4).map((tech) => (
                            <span key={tech} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">{tech}</span>
                          ))}
                        </div>
                      )}
                      {project.outcome && <p className="text-sm text-gray-600 leading-relaxed">{project.outcome}</p>}
                      {expandedProject === i && (project.problem || project.solution) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          {project.problem && <div><span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The Problem</span><p className="text-sm text-gray-600 mt-1 leading-relaxed">{project.problem}</p></div>}
                          {project.solution && <div><span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The Solution</span><p className="text-sm text-gray-600 mt-1 leading-relaxed">{project.solution}</p></div>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Experience */}
        {content.experience && content.experience.length > 0 && (
          <section id="experience" className={`w-full border-b border-gray-100 ${fadeIn('experience')}`}>
            <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Experience</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {content.experience.map((exp, i) => (
                  <div key={i} className={`relative pl-5 border-l-2 border-gray-100${content.experience.length % 2 !== 0 && i === content.experience.length - 1 ? ' lg:col-span-2' : ''}`}>
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#0A66C2]" />
                    <h3 className="font-semibold text-[#0A0A0A] text-base">{exp.role}</h3>
                    <p className="text-[#0A66C2] text-sm font-medium mt-0.5">{exp.company}</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">{exp.period}</p>
                    {exp.bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                            <span className="text-[#0A66C2] flex-shrink-0">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Education */}
        {content.education && content.education.length > 0 && (
          <section id="education" className={`w-full border-b border-gray-100 ${fadeIn('education')}`}>
            <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Education</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {content.education.map((ed, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <p className="font-semibold text-[#0A0A0A] text-base">{ed.degree}</p>
                    <p className="text-[#0A66C2] text-sm font-medium">{ed.institution}</p>
                    <p className="text-xs text-gray-400">{ed.year}{ed.grade ? ` · ${ed.grade}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Certifications */}
        {content.certifications && content.certifications.length > 0 && (
          <section id="certifications" className={`w-full border-b border-gray-100 ${fadeIn('certifications')}`}>
            <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {content.certifications.map((cert) => (
                  <span key={cert} className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full text-gray-700">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact */}
        <section id="contact" className={`w-full ${fadeIn('contact')}`}>
          <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contact</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] leading-tight mb-6" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Let&apos;s work together.
              </h2>
              <a href={`mailto:${content.email}`} className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-full hover:bg-[#0A66C2] hover:gap-3 transition-all duration-200">
                Get in touch →
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <a href={`mailto:${content.email}`} className="text-sm text-gray-600 hover:text-[#0A66C2] transition-colors">{content.email}</a>
              {content.github_url && <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-[#0A66C2] transition-colors">GitHub</a>}
              {content.linkedin_url && <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-[#0A66C2] transition-colors">LinkedIn</a>}
              {content.location && <p className="text-sm text-gray-400">{content.location}</p>}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-gray-100 px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between">
          <span className="text-xs text-gray-300">{content.name}</span>
          <a href="https://liveportfolio.site" className="text-xs text-gray-300 hover:text-[#0A66C2] transition-colors" target="_blank" rel="noopener noreferrer">
            Built with liveportfolio.site
          </a>
        </footer>
      </main>
    </div>
  )
}
