// Draft → the content shape the real template components render. Pure. Empty fields get plain placeholder text so the
// very first preview already looks like a portfolio. (Templates style their own text, so placeholders cannot be greyed
// individually; they are written to read as obvious samples instead.)

import type { PortfolioContent } from '@/components/templates/Minimal'
import { recommend } from '@/lib/blocks/presets'
import type { StoredContent } from '@/lib/blocks/mode'
import type { Draft } from './draft'

export const PLACEHOLDER = {
  name: 'Your name',
  role: 'Your professional title',
  about: 'A short paragraph about you appears here. Add it in the form.',
  location: 'Your location',
  email: 'you@example.com',
  skills: ['Skill one', 'Skill two', 'Skill three'],
  project: { title: 'Your project', problem: 'What the project is for, in a sentence or two.', solution: 'How you built it.', outcome: 'What changed because of it.' },
  experience: { company: 'Company', role: 'Your role', period: '2022 to now', bullets: ['What you did and what it achieved.'] },
} as const

const list = (csv: string) => csv.split(',').map((s) => s.trim()).filter(Boolean)

export function draftToPreviewContent(d: Draft | null, email: string): StoredContent {
  const name = d?.name.trim() || PLACEHOLDER.name
  const role = d?.role.trim() || PLACEHOLDER.role
  const skills = d?.skills.length ? d.skills : [...PLACEHOLDER.skills]
  const projects = (d?.projects ?? []).filter((p) => p.title.trim())
  const experience = (d?.experience ?? []).filter((e) => e.company.trim() || e.role.trim())
  const content: PortfolioContent = {
    name,
    role,
    headline: role,
    about: d?.bio.trim() || PLACEHOLDER.about,
    location: d?.location.trim() || PLACEHOLDER.location,
    email: email || PLACEHOLDER.email,
    avatar_url: d?.avatar_url || undefined,
    github_url: d?.github_url || undefined,
    linkedin_url: d?.linkedin_url || undefined,
    skills,
    skills_narrative: '',
    skills_grouped: [{ category: 'Skills', items: skills }],
    projects: projects.length
      ? projects.map((p) => ({ title: p.title, problem: p.description, solution: '', outcome: '', stack: list(p.stack), url: p.url || undefined, image_url: p.image_url || undefined }))
      : [{ ...PLACEHOLDER.project, stack: [...PLACEHOLDER.skills.slice(0, 2)] }],
    experience: experience.length
      ? experience.map((e) => ({
          company: e.company || PLACEHOLDER.experience.company,
          role: e.role || PLACEHOLDER.experience.role,
          period: e.period,
          bullets: e.bullets.split('\n').map((b) => b.trim()).filter(Boolean),
        }))
      : [{ ...PLACEHOLDER.experience, bullets: [...PLACEHOLDER.experience.bullets] }],
    education: (d?.education ?? []).filter((e) => e.degree.trim()).map((e) => ({ degree: e.degree, institution: e.institution, year: e.year, grade: e.grade || undefined })),
    certifications: d?.certifications.length ? d.certifications : undefined,
  }
  // every new portfolio is drawn with the block renderer, so the preview carries the layout a generated portfolio would get
  return { ...content, layout: recommend(content).layout }
}
