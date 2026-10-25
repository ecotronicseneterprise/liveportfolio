import type { PortfolioContent } from '@/components/templates/Minimal'

/** Explicit removal applies to both stored representations, including group-only skills. */
export function removeSkill<T extends Partial<PortfolioContent>>(content: T, skill: string): T {
  const keep = (value: string) => value.trim().toLocaleLowerCase() !== skill.trim().toLocaleLowerCase()
  return { ...content, skills: (content.skills ?? []).filter(keep),
    skills_grouped: (content.skills_grouped ?? []).map((group) => ({ ...group, items: group.items.filter(keep) })).filter((group) => group.items.length) }
}