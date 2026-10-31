import type { PortfolioContent } from '@/components/templates/Minimal'

export interface EditorAction {
  targetId: string
  create?: 'project' | 'experience'
}
export interface Improvement {
  id: string
  title: string
  detail: string
  cta: string
  action: EditorAction
  priority: number
}
export interface QualityCheck {
  id: string
  label: string
  complete: boolean
  improvement: Improvement
}
export interface QualityGroup {
  id: string
  label: string
  checks: QualityCheck[]
  score: number
}

const text = (value?: string | null) => !!value?.trim()

/** A content checklist, not an AI score or a prediction of hiring success. */
export function portfolioIntelligence(content: Partial<PortfolioContent>) {
  const projects = content.projects ?? []
  const experience = content.experience ?? []
  const education = content.education ?? []
  const skills = new Set([...(content.skills ?? []), ...(content.skills_grouped ?? []).flatMap(group => group.items ?? [])].map(s => s.trim().toLowerCase()).filter(Boolean))
  const project = (predicate: (p: NonNullable<PortfolioContent['projects']>[number]) => boolean) => {
    const index = projects.findIndex(predicate)
    return index < 0 ? 0 : index
  }
  const projectTarget = (field: string, index: number): EditorAction => projects.length
    ? { targetId: `editor-project-${index}-${field}` }
    : { targetId: 'editor-project-0-title', create: 'project' }
  const check = (id: string, label: string, complete: boolean, priority: number, title: string, detail: string, cta: string, action: EditorAction): QualityCheck => ({
    id, label, complete, improvement: { id, title, detail, cta, priority, action },
  })
  const identity = [
    check('name', 'Name', text(content.name), 100, 'Introduce yourself', 'Put a name behind your work.', 'Add your name', { targetId: 'editor-name' }),
    check('role', 'Professional title', text(content.role), 98, 'Make your role clear', 'Help a visitor understand what you do at a glance.', 'Add your role', { targetId: 'editor-role' }),
    check('headline', 'Headline', text(content.headline), 96, 'Lead with a clear headline', 'Explain the kind of work you do in one specific sentence.', 'Write your headline', { targetId: 'editor-headline' }),
    check('photo', 'Profile photo', text(content.avatar_url), 80, 'Put a face to your work', 'A recognisable photo makes your introduction more personal.', 'Add a profile photo', { targetId: 'editor-photo' }),
    check('location', 'Location', text(content.location), 60, 'Add your location', 'Let visitors know where you are based.', 'Add your location', { targetId: 'editor-location' }),
    check('contact', 'Contact email', text(content.email), 97, 'Make it easy to contact you', 'Give visitors a direct way to start a conversation.', 'Add a contact email', { targetId: 'editor-email' }),
    check('about', 'About you', text(content.about), 78, 'Tell the story behind your work', 'Add a short introduction to your experience and interests.', 'Write your introduction', { targetId: 'editor-about' }),
  ]
  const projectChecks = [
    check('projects', 'A named project', projects.some(p => text(p.title)), 95, 'Show your first piece of work', 'A personal, study or professional project can demonstrate your skills.', 'Add a project', projectTarget('title', project(p => !text(p.title)))),
    check('project-context', 'Project context', projects.length > 0 && projects.every(p => text(p.problem) && text(p.solution)), 85, 'Explain the work behind the result', 'Describe the problem and what you built, not only the project name.', 'Describe your project', projectTarget(projects[project(p => !text(p.problem) || !text(p.solution))]?.problem?.trim() ? 'solution' : 'problem', project(p => !text(p.problem) || !text(p.solution)))),
    check('project-outcomes', 'Project outcomes', projects.length > 0 && projects.every(p => text(p.outcome)), 93, 'Make your project results clearer', 'Explain what changed because of your work. Use numbers only when you can verify them.', 'Edit project outcomes', projectTarget('outcome', project(p => !text(p.outcome)))),
    check('project-proof', 'A link to your work', projects.some(p => text(p.url) || text(p.github_url)), 65, 'Give visitors a way to explore', 'Link to a live project or repository when you have one to share.', 'Add a project link', projectTarget('url', 0)),
  ]
  const firstWeakRole = Math.max(0, experience.findIndex(e => !text(e.company) || !text(e.role) || (e.bullets ?? []).filter(text).length < 2))
  const hasEducation = education.some(e => text(e.institution) && text(e.degree))
  const hasExperience = experience.some(e => text(e.company) && text(e.role))
  const experienceAction: EditorAction = experience.length
    ? { targetId: `editor-experience-${firstWeakRole}-${!text(experience[firstWeakRole].company) ? 'company' : !text(experience[firstWeakRole].role) ? 'role' : 'bullets'}` }
    : education.length ? { targetId: 'editor-education-0-institution' } : { targetId: 'editor-experience-0-company', create: 'experience' }
  const background = [
    check('background', 'Experience or education', hasExperience || hasEducation, 75, 'Add the background behind your skills', 'Work, volunteering or education can all give useful context.', 'Complete your background', experienceAction),
    check('experience-proof', 'Background detail', experience.some(e => (e.bullets ?? []).filter(text).length >= 2) || education.some(e => text(e.institution) && text(e.degree) && text(e.year)), 70, 'Give your background more detail', 'Add two specific points about a role, or complete your education details.', 'Improve your background', experience.length ? { targetId: `editor-experience-${firstWeakRole}-bullets` } : education.length ? { targetId: 'editor-education-0-year' } : experienceAction),
  ]
  const skillChecks = [check('skills', 'At least five distinct skills', skills.size >= 5, 72, 'Show your skills clearly', 'List the skills you can demonstrate in your work.', 'Add your skills', { targetId: 'editor-skills' })]
  const groups: QualityGroup[] = [
    { id: 'identity', label: 'Identity', checks: identity, score: 0 },
    { id: 'projects', label: 'Projects', checks: projectChecks, score: 0 },
    { id: 'background', label: 'Background', checks: background, score: 0 },
    { id: 'skills', label: 'Skills', checks: skillChecks, score: 0 },
  ].map(group => ({ ...group, score: Math.round(group.checks.filter(c => c.complete).length / group.checks.length * 100) }))
  const checks = groups.flatMap(group => group.checks)
  const completed = checks.filter(c => c.complete).length
  // A missing first project gets one actionable recommendation, not four copies of it.
  const improvements = checks.filter(c => !c.complete && (projects.length > 0 || !c.id.startsWith('project-')))
    .map(c => c.improvement).sort((a, b) => b.priority - a.priority)
  return { score: Math.round(completed / checks.length * 100), completed, total: checks.length, groups, improvements, next: improvements[0] ?? null }
}

export interface WeeklyInsight {
  score: number
  summary: string
  top_strength?: string
  top_gap?: string
  portfolio_actions?: string[]
  career_actions?: string[]
  scored_at: string
  cached: boolean
}

export function comparisonLabel(current: number, previous: number | null): string {
  if (previous === null) return 'Not enough history to compare'
  if (previous === 0) return current === 0 ? 'No change from previous period' : `${current.toLocaleString()} more than previous period`
  const change = Math.round((current - previous) / previous * 100)
  if (change === 0) return 'No change from previous period'
  return `${change > 0 ? '+' : ''}${change}% vs previous period`
}
