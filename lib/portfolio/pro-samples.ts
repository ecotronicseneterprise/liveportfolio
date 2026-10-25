// Invented content only. Never fetch a real account to validate a template.
import { SAMPLE_PEOPLE, SPARSE } from '@/lib/blocks/sample'
import type { PortfolioContent } from '@/components/templates/Minimal'
const base = SAMPLE_PEOPLE.engineer
const reviewOrigin = process.env.TEMPLATE_REVIEW_URL || 'http://localhost:3101'
export const PRO_SAMPLES: Record<string, PortfolioContent> = {
  sparse: { ...SPARSE, email: '', github_url: undefined, linkedin_url: undefined },
  chef: { ...base, name: 'Funke Example', role: 'Head chef', headline: 'Thoughtful menus. Well-run kitchens.', about: 'I develop seasonal menus and train kitchen teams.', github_url: undefined, linkedin_url: undefined,
    skills: ['Menu design', 'Food safety'], skills_grouped: [], projects: [{ title: 'Seasonal supper club', problem: 'A small dining room needed a focused menu.', solution: 'Developed a six-course seasonal menu.', outcome: 'Hosted 40 guests.', stack: [] }],
    experience: [{ role: 'Head chef', company: 'Example Kitchen', period: '2021–2024', bullets: ['Designed the seasonal menu.'] }], education: [], certifications: [], testimonials: [] },
  many: { ...base, projects: Array.from({ length: 50 }, (_, i) => ({ ...base.projects[0], title: `Project ${i + 1}` })),
    experience: Array.from({ length: 50 }, (_, i) => ({ ...base.experience[0], company: `Company ${i + 1}` })),
    education: Array.from({ length: 50 }, (_, i) => ({ degree: `Degree ${i + 1}`, institution: `Institution ${i + 1}`, year: `Year ${i + 1}` })),
    certifications: Array.from({ length: 50 }, (_, i) => `Certificate ${i + 1}`), testimonials: Array.from({ length: 50 }, (_, i) => ({ text: `Reference text ${i + 1}`, author: `Author ${i + 1}`, role: 'Peer' })) },
  hostile: { ...base, name: '<script>alert(1)</script>', headline: 'LongUnbrokenHeading'.repeat(20), about: 'LongUnbrokenBiography'.repeat(120),
    github_url: 'javascript:alert(1)', avatar_url: 'data:text/html,invalid', projects: [{ ...base.projects[0], title: 'LongProjectName'.repeat(20), url: 'javascript:alert(2)', image_url: 'javascript:alert(3)', stack: ['LongSkill'.repeat(20)] }] },
  // Same-origin synthetic image files, deliberately local: the broken case proves fallback without contacting a third party.
  broken: { ...base, avatar_url: `${reviewOrigin}/template-studies/missing.png`, projects: [{ ...base.projects[0], image_url: `${reviewOrigin}/template-studies/missing.png` }] },
  artwork: { ...SAMPLE_PEOPLE.designer, avatar_url: undefined, projects: SAMPLE_PEOPLE.designer.projects.map((p) => ({ ...p, image_url: `${reviewOrigin}/template-studies/project.svg` })) },
}