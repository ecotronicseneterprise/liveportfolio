export const SYSTEM_PROMPT = `You are a professional career copywriter specialising in tech portfolios for African and global tech talent. You transform raw professional information into polished, recruiter-ready portfolio content.

Write like a sharp recruiter rewrote their profile — competent, calm, specific, human. Use concrete specifics and active verbs. Sound like a real person, not an AI assistant.

NEVER USE THESE WORDS OR PHRASES:
passionate, results-driven, highly motivated, leveraging, cutting-edge, dynamic, innovative, spearheaded, impactful, fast-paced, detail-oriented, proactive, team player, self-starter, thought leader, go-getter, synergy, robust, seamless, scalable solutions, best-in-class, worked on, assisted with, contributed to, various responsibilities, helped with, disruptive.

Return valid JSON only. No preamble, no markdown, no commentary.`

export const buildGenerationPrompt = (input: {
  name: string
  role: string
  bio: string
  location: string
  email: string
  github_url?: string
  linkedin_url?: string
  skills: string[]
  certifications?: string[]
  projects: Array<{
    title: string
    description: string
    stack: string[]
    url?: string
  }>
  experience?: Array<{
    company: string
    role: string
    period: string
    bullets: string[]
  }>
  education?: Array<{
    degree: string
    institution: string
    year: string
    grade?: string
  }>
}) => {
  return `Given this professional information, generate a complete portfolio content object.

NAME: ${input.name}
ROLE: ${input.role}
LOCATION: ${input.location}
EMAIL: ${input.email}
${input.github_url ? `GITHUB: ${input.github_url}` : ''}
${input.linkedin_url ? `LINKEDIN: ${input.linkedin_url}` : ''}

BIO (raw, rewrite this professionally):
${input.bio || 'Not provided — infer from role and projects'}

SKILLS: ${input.skills.join(', ')}
${input.certifications && input.certifications.length > 0 ? `CERTIFICATIONS: ${input.certifications.join(', ')}` : ''}

PROJECTS:
${input.projects.map((p, i) => `${i + 1}. ${p.title}
   Description: ${p.description}
   Stack: ${p.stack.join(', ')}
   ${p.url ? `URL: ${p.url}` : ''}`).join('\n\n')}

${input.experience && input.experience.length > 0 ? `EXPERIENCE:
${input.experience.map(e => `${e.role} at ${e.company} (${e.period})`).join('\n')}` : ''}

${input.education && input.education.length > 0 ? `EDUCATION:
${input.education.map(e => `${e.degree} — ${e.institution}${e.year ? ` (${e.year})` : ''}${e.grade ? `, ${e.grade}` : ''}`).join('\n')}` : ''}

Return a JSON object with EXACTLY this structure:
{
  "name": "string — use as provided",
  "role": "string — use as provided",
  "headline": "string — one compelling sentence, max 120 chars, no buzzwords",
  "about": "string — 2 confident paragraphs, first-person, specific, human. No adjective soup.",
  "location": "string — use as provided",
  "email": "string — use as provided",
  "github_url": "string or null",
  "linkedin_url": "string or null",
  "skills": ["array of skill strings — use provided list"],
  "skills_narrative": "string — one sentence describing their technical profile specifically",
  "skills_grouped": [{"category": "string", "items": ["string"]}],
  "projects": [
    {
      "title": "string",
      "problem": "string — what business/user problem this solved, 1-2 sentences",
      "solution": "string — what was built and the key technical approach, 1-2 sentences",
      "outcome": "string — result or impact, include a specific number/metric if possible",
      "stack": ["array of tech strings"],
      "url": "string or null"
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "period": "string",
      "bullets": ["2-3 accomplishment bullets, specific and metric-driven"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "grade": "string or null"
    }
  ],
  "certifications": ["array of certification name strings — use provided list if any"],
  "seo_title": "string — '[Name] | [Role] Portfolio' format",
  "seo_description": "string — compelling meta description, max 155 chars"
}`
}

// Banned words for frontend display (to check AI output quality)
export const BANNED_WORDS = [
  'passionate', 'results-driven', 'highly motivated', 'leveraging',
  'cutting-edge', 'dynamic', 'innovative', 'spearheaded', 'impactful',
  'fast-paced', 'detail-oriented', 'proactive', 'team player', 'self-starter',
  'thought leader', 'go-getter', 'synergy', 'robust', 'seamless',
  'scalable solutions', 'best-in-class', 'disruptive',
]
