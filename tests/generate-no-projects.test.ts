// Projects are optional. /api/generate (real route, model mocked) must accept a request with none, must not keep any project
// the model makes up, and must still keep real ones (with their image URLs).
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: { id: 'user-1', email: 'ada@example.com' } as null | { id: string; email: string },
  modelReply: {} as Record<string, unknown>,
  prompts: [] as string[],
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => (h.user ? { data: { user: h.user }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) } }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb()
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({}) }
})
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async (a: { messages: { role: string; content: string }[] }) => {
          h.prompts.push(a.messages.find((m) => m.role === 'user')!.content)
          return { choices: [{ message: { content: JSON.stringify(h.modelReply) } }] }
        },
      },
    }
  },
}))

import '@/lib/supabase' // the route imports it lazily; this runs the mock factory so the fake database exists before the first test
import { NextRequest } from 'next/server'
import { POST } from '../app/api/generate/route'
import { buildGenerationPrompt, SYSTEM_PROMPT } from '../lib/prompts'
import { draftToGeneratePayload } from '../lib/onboarding/generate'
import { sanitizeDraft } from '../lib/onboarding/draft'

let n = 0
const call = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/generate', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++n}` }, body: JSON.stringify(body) }))

const INVENTED = { title: 'Totally Invented App', problem: 'p', solution: 's', outcome: 'o', stack: ['x'], url: null }
const modelReply = (projects: unknown[]) => ({
  headline: 'Backend engineer who ships payment systems', about: 'About text.', skills_narrative: 'Go and Postgres.', skills_grouped: [{ category: 'Core', items: ['Go'] }],
  projects, experience: [], education: [], certifications: [], seo_title: 'Ada | Backend', seo_description: 'Ada, backend engineer.',
})
const base = { name: 'Ada', role: 'Backend engineer', email: 'ada@example.com', location: 'Lagos', bio: '', skills: ['Go'], experience: [], education: [], template: 'minimal' }

beforeEach(() => {
  h.ctx!.db.portfolios = []
  h.ctx!.db.users = []
  h.prompts.length = 0
  h.user = { id: `user-${++n}`, email: 'ada@example.com' }
})

describe('/api/generate with no projects', () => {
  it('accepts it (no 400 for "Add at least one project"), and keeps no project the model invented', async () => {
    h.modelReply = modelReply([INVENTED])
    const res = await call({ ...base, projects: [] })
    expect(res.status).toBe(200)
    const saved = h.ctx!.db.portfolios[0]
    expect(saved.content.projects).toEqual([])
    expect(JSON.stringify(saved.content)).not.toContain('Totally Invented App')
  })

  it('works with no github url either, and tells the model not to invent projects', async () => {
    h.modelReply = modelReply([])
    const res = await call({ ...base, projects: [], github_url: undefined })
    expect(res.status).toBe(200)
    expect(h.prompts[0]).toContain('None provided. Return "projects": [] and do not invent any project.')
    expect(h.ctx!.db.portfolios[0].content.projects).toEqual([])
  })

  it('the review draft with an empty project list produces exactly such a request', () => {
    const d = sanitizeDraft({ name: 'Ada', role: 'Backend engineer', projects: [{ title: '   ', description: 'x', stack: '', url: '' }] })!
    expect(draftToGeneratePayload(d, 'ada@example.com').projects).toEqual([])
  })
})

describe('/api/generate with projects (unchanged behaviour)', () => {
  it('keeps the model\'s projects and merges the uploaded image URL by position', async () => {
    h.modelReply = modelReply([{ ...INVENTED, title: 'Invoice parser' }])
    const img = 'https://abcd1234.supabase.co/storage/v1/object/public/project-images/u-0.jpg'
    const res = await call({ ...base, projects: [{ title: 'Invoice parser', description: 'Reads invoices.', stack: ['python'], image_url: img }] })
    expect(res.status).toBe(200)
    const p = h.ctx!.db.portfolios[0].content.projects as Array<{ title: string; image_url: string | null }>
    expect(p).toHaveLength(1)
    expect(p[0].title).toBe('Invoice parser')
    expect(p[0].image_url).toBe(img)
    expect(h.prompts[0]).toContain('1. Invoice parser')
    expect(h.prompts[0]).not.toContain('None provided')
  })

  it('restores supported metrics verbatim and drops invented project and profile metrics', async () => {
    const sourceProject = {
      title: 'LedgerLite',
      description: 'Processed 20,000 transactions per day. Reduced processing time by 35%.',
      stack: ['TypeScript', 'PostgreSQL'],
      url: '',
    }
    const sourceExperience = {
      company: 'Example Labs', role: 'Backend Engineer', period: '2022–2025',
      bullets: ['Built a reconciliation API processing 20,000 transactions per day.', 'Reduced latency by 35%.'],
    }
    h.modelReply = {
      ...modelReply([{
        ...INVENTED,
        title: 'LedgerLite',
        problem: 'Teams processed 10,000 transactions each day.',
        solution: 'Built a reliable reconciliation service.',
        outcome: 'Processed 10,000 transactions per day and cut processing time by 35%.',
      }]),
      about: 'I improved system throughput by 500%.',
      experience: [{ company: 'Example Labs', role: 'Backend Engineer', period: '2022–2025', bullets: ['Processed 10,000 transactions per day.', 'Reduced latency by 35%.'] }],
      education: [{ degree: 'Invented degree', institution: 'Invented university', year: '2024' }],
      certifications: ['Invented certification'],
    }

    const res = await call({ ...base, projects: [sourceProject], experience: [sourceExperience] })
    expect(res.status).toBe(200)
    const saved = h.ctx!.db.portfolios[0].content
    const project = (saved.projects as Array<Record<string, unknown>>)[0]
    expect(project.title).toBe('LedgerLite')
    expect(project.outcome).toBe('Outcome not provided.')
    expect(project.problem).toBe('Project details provided by you.')
    expect(project.solution).toBe('Built a reliable reconciliation service.')
    expect(saved.about).not.toContain('500%')
    expect(saved.experience).toEqual([{
      company: 'Example Labs', role: 'Backend Engineer', period: '2022–2025',
      bullets: [sourceExperience.bullets[1]],
    }])
    expect(saved.education).toEqual([])
    expect(saved.certifications).toEqual([])
  })

  it('does not borrow generated project copy by array position when the model changes the title', async () => {
    h.modelReply = modelReply([{ ...INVENTED, title: 'Different project', solution: 'Built a queue service.' }])
    const res = await call({ ...base, projects: [{ title: 'LedgerLite', description: 'Tracks invoices.', stack: ['TypeScript'] }] })
    expect(res.status).toBe(200)
    const [project] = h.ctx!.db.portfolios[0].content.projects as Array<Record<string, unknown>>
    expect(project).toMatchObject({ title: 'LedgerLite', problem: 'Project details provided by you.', solution: 'Project details provided by you.', outcome: 'Outcome not provided.' })
  })

  it('still needs a name, a role and an e-mail', async () => {
    h.modelReply = modelReply([])
    expect((await call({ ...base, name: '', projects: [] })).status).toBe(400)
    expect((await call({ ...base, role: '', projects: [] })).status).toBe(400)
    expect((await call({ ...base, email: '', projects: [] })).status).toBe(400)
  })

  it('still generates only once per user', async () => {
    h.modelReply = modelReply([])
    const first = await (await call({ ...base, projects: [] })).json()
    const again = await (await call({ ...base, projects: [] })).json()
    expect(again.portfolio_id).toBe(first.portfolio_id)
    expect(h.prompts).toHaveLength(1)
  })
})

describe('prompt', () => {
  const input = { ...base, github_url: undefined, linkedin_url: undefined, certifications: [], projects: [] as never[] }
  it('names the empty case explicitly and never prints a blank numbered list', () => {
    const p = buildGenerationPrompt(input as never)
    expect(p).toMatch(/PROJECTS:\nNone provided\./)
    expect(p).not.toMatch(/PROJECTS:\n\s*\n/)
    expect(SYSTEM_PROMPT).toContain('never invent, estimate, round, or change a metric')
  })

  it('sends the source experience bullets so the model has the facts it must preserve', () => {
    const p = buildGenerationPrompt({
      ...input,
      experience: [{ company: 'Example Labs', role: 'Engineer', period: '2022–2025', bullets: ['Reduced latency by 35%.'] }],
    } as never)
    expect(p).toContain('- Reduced latency by 35%.')
  })
})
