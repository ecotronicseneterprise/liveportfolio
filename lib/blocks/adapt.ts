// PortfolioContent (what is stored) -> BlockData (what the blocks draw). Pure and defensive: stored content comes from a database and from
// model output, so every field may be missing, the wrong type or empty. A block whose data is empty renders nothing at all.
import type { PortfolioContent } from '@/components/templates/Minimal'
import { t } from '@/lib/onboarding/t'

export interface BlockProject { title: string; problem: string; solution: string; outcome: string; stack: string[]; url?: string; sourceUrl?: string; imageUrl?: string }
export interface BlockRole { company: string; role: string; period: string; bullets: string[] }
export interface BlockData {
  name: string
  role: string
  headline: string
  location: string
  email: string
  avatarUrl?: string
  about: string[]
  projects: BlockProject[]
  experience: BlockRole[]
  skillGroups: Array<{ category: string; items: string[] }>
  education: string[]
  certifications: string[]
  quote?: { text: string; author: string; role: string }
  links: Array<{ label: string; url: string }>
}

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strs = (v: unknown, max = 200, cap = 50): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, cap) : [])

/** The landing page's own sample pictures live in /public/landing. Only that exact folder is accepted as a local path. */
const LOCAL_ASSET = /^\/landing\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/
export function localAsset(v: unknown): string | undefined {
  return typeof v === 'string' && LOCAL_ASSET.test(v.trim()) ? v.trim() : undefined
}

/** http(s) only. A stored value that is not a web address is dropped, never rendered as a link. */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v, 500)
  if (!s) return undefined
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined
    if (u.username || u.password) return undefined
    return u.toString()
  } catch {
    return undefined
  }
}

export function toBlockData(c: Partial<PortfolioContent> | null | undefined): BlockData {
  const content = (c ?? {}) as Partial<PortfolioContent>
  const projects: BlockProject[] = (Array.isArray(content.projects) ? content.projects : [])
    .map((p) => ({
      title: str(p?.title, 160),
      problem: str(p?.problem, 800),
      solution: str(p?.solution, 800),
      outcome: str(p?.outcome, 800),
      stack: strs(p?.stack, 40, 12),
      url: safeUrl(p?.url),
      sourceUrl: safeUrl(p?.github_url),
      imageUrl: localAsset(p?.image_url) ?? ((): string | undefined => { const u = safeUrl(p?.image_url); return u && u.startsWith('https://') ? u : undefined })(),
    }))
    .filter((p) => p.title)

  const experience: BlockRole[] = (Array.isArray(content.experience) ? content.experience : [])
    .map((e) => ({ company: str(e?.company, 160), role: str(e?.role, 160), period: str(e?.period, 80), bullets: strs(e?.bullets, 400, 12) }))
    .filter((e) => e.company || e.role)

  let skillGroups = (Array.isArray(content.skills_grouped) ? content.skills_grouped : [])
    .map((g) => ({ category: str(g?.category, 80), items: strs(g?.items, 60, 30) }))
    .filter((g) => g.items.length)
  if (!skillGroups.length) {
    const flat = strs(content.skills, 60, 30)
    if (flat.length) skillGroups = [{ category: t('portfolio.skills'), items: flat }]
  }

  const education = (Array.isArray(content.education) ? content.education : [])
    .map((e) => {
      const head = [str(e?.degree, 160), str(e?.institution, 160)].filter(Boolean).join(', ')
      if (!head) return ''
      const tail = [str(e?.year, 20)].filter(Boolean).join('')
      const grade = str(e?.grade, 60)
      return `${head}${tail ? `, ${tail}` : ''}${grade ? ` (${grade})` : ''}`
    })
    .filter(Boolean)

  const q = Array.isArray(content.testimonials) ? content.testimonials.find((x) => str(x?.text) && str(x?.author)) : undefined
  const quote = q ? { text: str(q.text, 500), author: str(q.author, 100), role: [str(q.role, 100), str(q.company, 100)].filter(Boolean).join(', ') } : undefined

  const links: Array<{ label: string; url: string }> = []
  const gh = safeUrl(content.github_url)
  const li = safeUrl(content.linkedin_url)
  if (gh) links.push({ label: t('portfolio.github'), url: gh })
  if (li) links.push({ label: t('portfolio.linkedin'), url: li })

  const avatar = safeUrl(content.avatar_url)
  return {
    name: str(content.name, 120) || '',
    role: str(content.role, 160),
    headline: str(content.headline, 240),
    location: str(content.location, 120),
    email: str(content.email, 254),
    avatarUrl: localAsset(content.avatar_url) ?? (avatar && avatar.startsWith('https://') ? avatar : undefined),
    about: str(content.about, 6000).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean),
    projects,
    experience,
    skillGroups,
    education,
    certifications: strs(content.certifications, 160, 12),
    quote,
    links,
  }
}
