'use client'

import { Space_Mono, Sora } from 'next/font/google'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import type { PortfolioContent } from './Minimal'

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

function useTypewriter(text: string, speed = 60) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])
  return displayed
}

export default function Bold({ content }: { content: PortfolioContent }) {
  const [activeSection, setActiveSection] = useState('about')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const typedRole = useTypewriter(content.role, 60)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set([...prev, entry.target.id]))
            if (entry.intersectionRatio > 0.5) {
              setActiveSection(entry.target.id)
            }
          }
        })
      },
      { threshold: [0.1, 0.5] }
    )
    document.querySelectorAll('section[id]').forEach((s) => observerRef.current?.observe(s))
    return () => observerRef.current?.disconnect()
  }, [])

  const navItems = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'experience', label: 'Experience' },
    { id: 'contact', label: 'Contact' },
  ]

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div
      className={`${spaceMono.variable} ${sora.variable} min-h-screen bg-[#0D1117] text-[#F0F6FF]`}
      style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif' }}
    >
      {/* Mobile nav */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-sm border-b border-[#1C2128]">
        <div className="flex items-center justify-between px-5 py-4">
          <span
            className="text-base font-bold text-[#58A6FF]"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {content.name}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#F0F6FF] p-1"
            aria-label="Toggle menu"
          >
            <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-[#1C2128] px-5 py-3 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block w-full text-left text-sm py-2 text-[#8B949E] hover:text-[#58A6FF] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:flex lg:min-h-screen w-full">

        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto px-8 py-12 border-r border-[#1C2128]">
          {content.avatar_url && (
            <div className="mb-6">
              <Image
                src={content.avatar_url}
                alt={content.name}
                width={72}
                height={72}
                className="rounded-full object-cover object-top border-2 border-[#1C2128]"
              />
            </div>
          )}

          <h1
            className="text-xl font-bold text-[#F0F6FF] mb-1 leading-tight break-words"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {content.name}
          </h1>
          <p className={`text-sm text-[#58A6FF] ${content.location ? 'mb-1' : 'mb-8'}`}>
            {content.role}
          </p>
          {content.location && (
            <p className="text-xs text-[#8B949E] mb-8">{content.location}</p>
          )}


          <nav className="space-y-1 mb-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-lg transition-all border-l-2 ${
                  activeSection === item.id
                    ? 'bg-[#1C2128] text-[#58A6FF] border-[#58A6FF]'
                    : 'text-[#8B949E] hover:text-[#F0F6FF] hover:bg-[#1C2128]/50 border-transparent'
                }`}
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="space-y-2 mt-auto">
            <a
              href={`mailto:${content.email}`}
              className="flex items-center gap-2 text-xs text-[#8B949E] hover:text-[#58A6FF] transition-colors"
            >
              <span>✉</span>
              <span className="truncate">{content.email}</span>
            </a>
            {content.github_url && (
              <a
                href={content.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#8B949E] hover:text-[#58A6FF] transition-colors"
              >
                <span>⌥</span>
                <span>GitHub</span>
              </a>
            )}
            {content.linkedin_url && (
              <a
                href={content.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#8B949E] hover:text-[#58A6FF] transition-colors"
              >
                <span>◈</span>
                <span>LinkedIn</span>
              </a>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-[#1C2128]">
            <a
              href="https://liveportfolio.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#30363D] hover:text-[#58A6FF] transition-colors"
            >
              Built with liveportfolio.site
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-6 lg:px-16 xl:px-24 py-8 lg:py-16">

          {/* Hero */}
          <div className="mb-16">

            <p
              className="text-xs text-[#8B949E] mb-3 tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {typedRole}<span className="animate-pulse">|</span>
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4 leading-tight bg-gradient-to-r from-[#F0F6FF] to-[#58A6FF] bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {content.headline}
            </h2>
            <div className="w-12 h-0.5 bg-[#58A6FF]" />
          </div>

          {/* About */}
          <section
            id="about"
            className={`mb-16 transition-all duration-700 ${visible.has('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <h3
              className="text-xs text-[#58A6FF] font-bold uppercase tracking-widest mb-5"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              About
            </h3>
            <div className="space-y-4">
              {content.about.split('\n\n').map((para, i) => (
                <p key={i} className="text-[#8B949E] leading-relaxed text-sm">{para}</p>
              ))}
            </div>
          </section>

          {/* Skills — hidden if no skills data */}
          {(content.skills.length > 0 || content.skills_grouped.length > 0) && (
            <section
              id="skills"
              className={`mb-16 transition-all duration-700 ${visible.has('skills') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '100ms' }}
            >
              <h3
                className="text-xs text-[#58A6FF] font-bold uppercase tracking-widest mb-5"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                Skills
              </h3>
              <p className="text-xs text-[#8B949E] italic mb-6">{content.skills_narrative}</p>
              {content.skills_grouped.length > 0 ? (
                <div className="space-y-5">
                  {content.skills_grouped.map((group, i) => (
                    <div key={i}>
                      <p
                        className="text-xs text-[#58A6FF] mb-2"
                        style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                      >
                        {group.category}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 text-xs bg-[#1C2128] border border-[#30363D] rounded text-[#8B949E] hover:border-[#58A6FF] hover:text-[#58A6FF] hover:scale-105 transition-all cursor-default"
                            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
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
                      className="px-3 py-1 text-xs bg-[#1C2128] border border-[#30363D] rounded text-[#8B949E] hover:border-[#58A6FF] hover:text-[#58A6FF] hover:scale-105 transition-all cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Projects — hidden if empty */}
          {content.projects.length > 0 && (
            <section
              id="projects"
              className={`mb-16 transition-all duration-700 ${visible.has('projects') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '150ms' }}
            >
              <h3
                className="text-xs text-[#58A6FF] font-bold uppercase tracking-widest mb-6"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                Projects
              </h3>
              <div className="space-y-5">
                {content.projects.map((project, i) => (
                  <div
                    key={i}
                    className="bg-[#1C2128] border border-[#30363D] rounded-xl overflow-hidden hover:border-[#58A6FF] transition-all group"
                    style={{ borderLeft: '3px solid #58A6FF' }}
                  >
                    {project.image_url && (
                      <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <Image
                          src={project.image_url}
                          alt={project.title}
                          width={640}
                          height={360}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4
                          className="text-base font-bold text-[#F0F6FF] group-hover:text-[#58A6FF] transition-colors"
                          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                        >
                          {project.title}
                        </h4>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#58A6FF] hover:underline ml-4 flex-shrink-0"
                          >
                            View ↗
                          </a>
                        )}
                      </div>

                      <div className="space-y-3 mb-4">
                        {project.problem && (
                          <div>
                            <span className="text-xs text-[#58A6FF] font-bold" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>Problem: </span>
                            <span className="text-xs text-[#8B949E] leading-relaxed">{project.problem}</span>
                          </div>
                        )}
                        {project.solution && (
                          <div>
                            <span className="text-xs text-[#58A6FF] font-bold" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>Solution: </span>
                            <span className="text-xs text-[#8B949E] leading-relaxed">{project.solution}</span>
                          </div>
                        )}
                        {project.outcome && (
                          <div className="bg-[#0D1117] border border-[#1a5fa8] rounded-lg px-3 py-2 shadow-[0_0_8px_rgba(10,102,194,0.15)]">
                            <span className="text-xs text-[#0A66C2] font-medium">{project.outcome}</span>
                          </div>
                        )}
                      </div>

                      {project.stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {project.stack.slice(0, 5).map((tech) => (
                            <span
                              key={tech}
                              className="text-xs px-2 py-0.5 bg-[#0D1117] text-[#8B949E] rounded border border-[#30363D]"
                              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                            >
                              {tech}
                            </span>
                          ))}
                          {project.stack.length > 5 && (
                            <span
                              className="text-xs px-2 py-0.5 text-[#8B949E]"
                              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                            >
                              +{project.stack.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Experience — hidden if empty */}
          {content.experience && content.experience.length > 0 && (
            <section
              id="experience"
              className={`mb-16 transition-all duration-700 ${visible.has('experience') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <h3
                className="text-xs text-[#58A6FF] font-bold uppercase tracking-widest mb-6"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                Experience
              </h3>
              <div className="space-y-6">
                {content.experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                      <h4
                        className="font-bold text-[#F0F6FF] text-sm"
                        style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                      >
                        {exp.role}
                      </h4>
                      <span className="text-[#8B949E] text-sm">@ {exp.company}</span>
                    </div>
                    <p
                      className="text-xs text-[#58A6FF] mb-3"
                      style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                    >
                      {exp.period}
                    </p>
                    {exp.bullets.length > 0 && (
                      <ul className="space-y-2">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j} className="text-sm text-[#8B949E] leading-relaxed flex gap-2">
                            <span className="text-[#58A6FF] flex-shrink-0 mt-0.5">▸</span>
                            <span>{bullet}</span>
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
          <section
            id="contact"
            className={`mb-16 transition-all duration-700 ${visible.has('contact') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '250ms' }}
          >
            <h3
              className="text-xs text-[#58A6FF] font-bold uppercase tracking-widest mb-5"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Contact
            </h3>
            <p className="text-[#8B949E] text-sm leading-relaxed mb-6">
              Open to new opportunities and interesting conversations.
            </p>
            <a
              href={`mailto:${content.email}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#58A6FF] text-[#0D1117] text-sm font-bold rounded-lg hover:bg-[#79B8FF] transition-colors"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              Get in touch →
            </a>
          </section>

          {/* Mobile footer */}
          <footer className="lg:hidden pt-8 border-t border-[#1C2128] text-center">
            <a
              href="https://liveportfolio.site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#30363D] hover:text-[#58A6FF] transition-colors"
            >
              Built with liveportfolio.site
            </a>
          </footer>
        </main>
      </div>
    </div>
  )
}
