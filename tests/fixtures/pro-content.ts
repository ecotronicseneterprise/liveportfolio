import type { PortfolioContent } from '../../components/templates/Minimal'

// Invented, deliberately distinct field markers: checking titles alone misses data loss.
export const proContent: PortfolioContent = {
  name: 'Ada Evidence', role: 'Research professional', headline: 'Headline evidence marker',
  about: 'About evidence marker\n\nSecond paragraph evidence marker', location: 'Lagos', email: 'ada@example.com',
  github_url: 'https://github.com/example', linkedin_url: 'https://linkedin.com/in/example',
  skills: ['SQL', 'SIEM', 'AWS', 'Azure', 'Standalone skill marker'],
  skills_narrative: 'Skills narrative evidence marker',
  skills_grouped: [{ category: 'Explicit category marker', items: ['Grouped skill marker'] }],
  projects: [{ title: 'Project evidence marker', problem: 'Problem evidence marker', solution: 'Solution evidence marker',
    outcome: 'In 2024 processed 1.5M records at 95% accuracy; cost ₦15,000; change -3.5%.',
    stack: ['Stack evidence marker'], url: 'https://example.com/demo', github_url: 'https://github.com/example/repository' }],
  experience: [{ company: 'Example University', role: 'Employment role marker', period: '2020–2024', bullets: ['Employment bullet marker'] }],
  education: [{ institution: 'Example University', degree: 'Explicit degree marker', year: '2019', grade: 'Grade evidence marker' }],
  certifications: ['Actual certificate marker'],
  testimonials: [{ text: 'Testimonial evidence marker', author: 'Reference author marker', role: 'Reference role marker', company: 'Reference company marker' }],
}

export const contentMarkers = [
  proContent.name, proContent.role, proContent.headline, 'About evidence marker', 'Second paragraph evidence marker',
  proContent.location, proContent.email, ...proContent.skills, proContent.skills_narrative,
  'Explicit category marker', 'Grouped skill marker', 'Project evidence marker', 'Problem evidence marker', 'Solution evidence marker',
  proContent.projects[0].outcome, 'Stack evidence marker', 'Employment role marker', 'Employment bullet marker',
  'Example University', 'Explicit degree marker', '2019', 'Grade evidence marker', 'Actual certificate marker',
  'Testimonial evidence marker', 'Reference author marker', 'Reference role marker', 'Reference company marker',
]