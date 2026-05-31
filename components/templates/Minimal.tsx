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
        <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400 tracking-wide">
            {content.name.split(' ')[0].toLowerCase()}.liveportfolio.site
          </span>
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-gray-500 hover:text-[#0A0A0A] transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <button
            className="sm:hidden p-1 text-gray-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 px-6 py-3 space-y-1 bg-white">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-gray-600 hover:text-[#0A66C2] transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        )}
      </nav>

      <main className="max-w-[680px] mx-auto px-6">

        {/* Hero */}
        <section className="pt-20 pb-16 border-b border-gray-100">
          <div className="flex items-start gap-6 mb-8">
            {content.avatar_url && (
              <div className="flex-shrink-0">
                <Image
                  src={content.avatar_url}
                  alt={content.name}
                  width={80}
                  height={80}
                  className="rounded-full object-cover object-top"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight break-words"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                {content.name}
              </h1>
              <div className="w-8 h-0.5 bg-[#0A66C2] my-3" />
              <p className="text-lg text-gray-500">{content.role}</p>
            </div>
          </div>

          <p className="text-xl leading-relaxed text-[#0A0A0A] max-w-prose">
            {content.headline}
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <a href={`mailto:${content.email}`} className="text-sm text-[#0A66C2] hover:underline font-medium">
              {content.email}
            </a>
            {content.github_url && (
              <a href={content.github_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline font-medium">
                GitHub →
              </a>
            )}
            {content.linkedin_url && (
              <a href={content.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline font-medium">
                LinkedIn →
              </a>
            )}
            {content.location && (
              <span className="text-sm text-gray-400">{content.location}</span>
            )}
          </div>
        </section>

        {/* About */}
        <section id="about" className={`py-16 border-b border-gray-100 ${fadeIn('about')}`}>
          <div className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-12">
            <div className="mb-4 sm:mb-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">About</span>
            </div>
            <div>
              {content.about.split('\n\n').map((para, i) => (
                <p key={i} className="text-base leading-relaxed text-gray-700 mb-4 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Skills — hidden if no skills data */}
        {(content.skills.length > 0 || content.skills_grouped.length > 0) && (
          <section id="skills" className={`py-16 border-b border-gray-100 ${fadeIn('skills')}`}>
            <div className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-12">
              <div className="mb-4 sm:mb-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Skills</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-6 italic">{content.skills_narrative}</p>
                {content.skills_grouped.length > 0 ? (
                  <div className="space-y-5">
                    {content.skills_grouped.map((group, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {group.category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((skill) => (
                            <span
                              key={skill}
                              className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded-full text-gray-700 hover:border-[#0A66C2] hover:text-[#0A66C2] hover:scale-105 transition-all"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {content.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded-full text-gray-700 hover:border-[#0A66C2] hover:text-[#0A66C2] hover:scale-105 transition-all"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Projects — hidden if no projects */}
        {content.projects.length > 0 && (
          <section id="projects" className={`py-16 border-b border-gray-100 ${fadeIn('projects')}`}>
            <div className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-12">
              <div className="mb-6 sm:mb-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Projects</span>
              </div>
              <div className="space-y-6">
                {content.projects.map((project, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#0A66C2] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    onClick={() => setExpandedProject(expandedProject === i ? null : i)}
                  >
                    {project.image_url && (
                      <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <Image
                          src={project.image_url}
                          alt={project.title}
                          width={640}
                          height={360}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3
                            className="text-lg font-semibold text-[#0A0A0A] mb-1"
                            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                          >
                            {project.title}
                          </h3>
                          {project.stack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {project.stack.slice(0, 5).map((tech) => (
                                <span key={tech} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                  {tech}
                                </span>
                              ))}
                              {project.stack.length > 5 && (
                                <span className="text-xs px-2 py-0.5 text-gray-400">
                                  +{project.stack.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-[#0A66C2] hover:underline"
                            >
                              View →
                            </a>
                          )}
                          <span className="text-gray-300 text-xs">{expandedProject === i ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {project.outcome && (
                        <p className="text-sm text-gray-600 leading-relaxed">{project.outcome}</p>
                      )}

                      {expandedProject === i && (project.problem || project.solution) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          {project.problem && (
                            <div>
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The Problem</span>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{project.problem}</p>
                            </div>
                          )}
                          {project.solution && (
                            <div>
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">The Solution</span>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{project.solution}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Experience — hidden if empty */}
        {content.experience && content.experience.length > 0 && (
          <section id="experience" className={`py-16 border-b border-gray-100 ${fadeIn('experience')}`}>
            <div className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-12">
              <div className="mb-6 sm:mb-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Experience</span>
              </div>
              <div className="space-y-8">
                {content.experience.map((exp, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-gray-100">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#0A66C2]" />
                    <div className="mb-1">
                      <h3 className="font-semibold text-[#0A0A0A]">{exp.role}</h3>
                      <span className="text-gray-400 text-sm">{exp.company}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{exp.period}</p>
                    {exp.bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j} className="text-sm text-gray-600 leading-relaxed flex gap-2">
                            <span className="text-[#0A66C2] mt-1 flex-shrink-0">•</span>
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

        {/* Contact */}
        <section id="contact" className={`py-16 border-b border-gray-100 ${fadeIn('contact')}`}>
          <div className="sm:grid sm:grid-cols-[120px_1fr] sm:gap-12">
            <div className="mb-4 sm:mb-0">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Contact</span>
            </div>
            <div>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Open to new opportunities and interesting conversations.
              </p>
              <a
                href={`mailto:${content.email}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-full hover:bg-[#0A66C2] hover:gap-3 transition-all duration-200"
              >
                Get in touch →
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center">
          <a
            href="https://liveportfolio.site"
            className="text-xs text-gray-300 hover:text-[#0A66C2] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Built with liveportfolio.site
          </a>
        </footer>
      </main>
    </div>
  )
}
