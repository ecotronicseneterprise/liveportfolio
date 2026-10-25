import type { PortfolioContent } from '@/components/templates/Minimal'
import { safeContent } from './render-safe'

const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const string = (v: unknown) => typeof v === 'string' ? v : ''
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()) : []
const objects = (v: unknown) => Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)).map(object) : []

/** Tolerant rendering, never a write transform. No slicing, numeric extraction or inferred qualifications. */
export function proContent(input: unknown): PortfolioContent {
  const c = safeContent(object(input))
  const email = string(c.email)
  return {
    name: string(c.name), role: string(c.role), headline: string(c.headline), about: string(c.about), location: string(c.location),
    email: /^[^\s@?&#\r\n]+@[^\s@?&#\r\n]+\.[^\s@?&#\r\n]+$/.test(email) ? email : '',
    github_url: string(c.github_url), linkedin_url: string(c.linkedin_url), avatar_url: string(c.avatar_url),
    phone: string(c.phone), whatsapp: string(c.whatsapp), twitter_url: string(c.twitter_url), instagram_url: string(c.instagram_url),
    facebook_url: string(c.facebook_url), youtube_url: string(c.youtube_url), tiktok_url: string(c.tiktok_url), website_url: string(c.website_url),
    skills: strings(c.skills), skills_narrative: string(c.skills_narrative),
    skills_grouped: objects(c.skills_grouped).map((g) => ({ category: string(g.category), items: strings(g.items) })).filter((g) => g.items.length),
    projects: objects(c.projects).map((p) => ({ title: string(p.title), problem: string(p.problem), solution: string(p.solution), outcome: string(p.outcome),
      stack: strings(p.stack), url: string(p.url), github_url: string(p.github_url), image_url: string(p.image_url) })),
    experience: objects(c.experience).map((e) => ({ company: string(e.company), role: string(e.role), period: string(e.period), bullets: strings(e.bullets) })),
    education: objects(c.education).map((e) => ({ degree: string(e.degree), institution: string(e.institution), year: string(e.year), period: string(e.period), grade: string(e.grade) })),
    certifications: strings(c.certifications),
    testimonials: objects(c.testimonials).map((q) => ({ text: string(q.text), author: string(q.author), role: string(q.role), company: string(q.company) })),
    pro_designs: c.pro_designs,
  }
}

/** Supplied groups plus any standalone skills they do not contain. No guessing a person's specialty. */
export function completeSkillGroups(c: PortfolioContent) {
  const groups = c.skills_grouped.filter((g) => g.items.length)
  const included = new Set(groups.flatMap((g) => g.items.map((s) => s.toLocaleLowerCase())))
  const remaining = c.skills.filter((s) => !included.has(s.toLocaleLowerCase()))
  return [...groups, ...(remaining.length ? [{ category: groups.length ? 'Additional skills' : 'Skills', items: remaining }] : [])]
}