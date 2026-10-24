// Columns derived from content: the health score and the SEO title/description. Moved out of /api/update unchanged so the
// edit route, restore and (later) the assistant all derive them the same way.
export function calculateHealthScore(content: Record<string, unknown>): number {
  let score = 0
  if (content.avatar_url) score += 10
  if (content.github_url) score += 10
  if (content.linkedin_url) score += 10
  const projects = content.projects as Array<{ outcome?: string }> | undefined
  if (projects && projects.length >= 3) score += 20
  if (projects) {
    const withMetric = projects.filter((p) => /\d/.test(p.outcome || '')).length
    score += Math.min(withMetric * 5, 15)
  }
  const about = content.about as string | undefined
  if (about && about.split(' ').length > 100) score += 10
  const skills = content.skills as string[] | undefined
  if (skills && skills.length >= 5) score += 10
  const experience = content.experience as unknown[] | undefined
  if (experience && experience.length > 0) score += 15
  return Math.min(score, 100)
}

export function deriveSeo(content: Record<string, unknown>): { seo_title: string; seo_description: string } {
  const name = (content.name as string) || ''
  const role = (content.role as string) || ''
  const about = (content.about as string) || ''
  return {
    seo_title: role ? `${name} | ${role}` : `${name} | Portfolio`,
    seo_description: about ? about.slice(0, 155).replace(/\n/g, ' ').trim() : `${name}'s professional portfolio — built with LivePortfolio.`,
  }
}
