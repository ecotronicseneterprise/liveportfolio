import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { SYSTEM_PROMPT, buildGenerationPrompt } from '@/lib/prompts'

// In-memory IP rate limit: 5 per day
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function isIpRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  const DAY_MS = 24 * 60 * 60 * 1000
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + DAY_MS })
    return false
  }
  if (entry.count >= 5) return true
  entry.count++
  return false
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

function stripBulletMarker(s: string): string {
  return s.replace(/^[\s▸•→\-\*▶‣◦]+/, '').trim()
}

function fallbackContent(input: ReturnType<typeof parseInput>) {
  return {
    name: input.name,
    role: input.role,
    headline: `${input.role} based in ${input.location || 'the world'}`,
    about: `Professional with experience in ${input.skills.slice(0, 3).join(', ')}. Currently building ${input.projects[0]?.title || 'exciting projects'}.`,
    location: input.location,
    email: input.email,
    github_url: input.github_url || null,
    linkedin_url: input.linkedin_url || null,
    avatar_url: null,
    skills: input.skills,
    skills_narrative: `Experienced in ${input.skills.slice(0, 4).join(', ')} and more.`,
    skills_grouped: [{ category: 'Technical Skills', items: input.skills }],
    projects: input.projects.map((p) => ({
      title: p.title,
      problem: p.description,
      solution: p.description,
      outcome: 'Project delivered successfully.',
      stack: p.stack,
      url: p.url || null,
      image_url: p.image_url || null,
    })),
    experience: input.experience || [],
    seo_title: `${input.name} | ${input.role} Portfolio`,
    seo_description: `${input.role} with skills in ${input.skills.slice(0, 3).join(', ')}.`,
  }
}

interface InputData {
  name: string
  role: string
  bio: string
  location: string
  email: string
  github_url?: string
  linkedin_url?: string
  skills: string[]
  certifications?: string[]
  projects: Array<{ title: string; description: string; stack: string[]; url?: string; image_url?: string }>
  experience?: Array<{ company: string; role: string; period: string; bullets: string[] }>
  education?: Array<{ degree: string; institution: string; year: string; grade?: string }>
  template: string
}

function parseInput(body: Partial<InputData>) {
  return {
    name: stripHtml(body.name || '').slice(0, 80),
    role: stripHtml(body.role || '').slice(0, 80),
    bio: stripHtml(body.bio || '').slice(0, 500),
    location: stripHtml(body.location || '').slice(0, 80),
    email: stripHtml(body.email || '').slice(0, 120),
    github_url: body.github_url ? stripHtml(body.github_url).slice(0, 200) : undefined,
    linkedin_url: body.linkedin_url ? stripHtml(body.linkedin_url).slice(0, 200) : undefined,
    skills: (body.skills || []).slice(0, 15).map((s) => stripHtml(s).slice(0, 50)),
    certifications: (body.certifications || []).slice(0, 20).map((c) => stripHtml(c).slice(0, 80)),
    projects: (body.projects || []).slice(0, 4).map((p) => ({
      title: stripHtml(p.title || '').slice(0, 80),
      description: stripHtml(p.description || '').slice(0, 200),
      stack: (p.stack || []).slice(0, 10).map((t) => stripHtml(t).slice(0, 30)),
      url: p.url ? stripHtml(p.url).slice(0, 200) : undefined,
      image_url: typeof p.image_url === 'string' ? p.image_url.slice(0, 500) : undefined,
    })),
    experience: (body.experience || []).map((e) => ({
      company: stripHtml(e.company || '').slice(0, 80),
      role: stripHtml(e.role || '').slice(0, 80),
      period: stripHtml(e.period || '').slice(0, 40),
      bullets: (e.bullets || []).slice(0, 4).map((b) => stripBulletMarker(stripHtml(b)).slice(0, 200)).filter((b) => b.length > 0 && !b.endsWith(':')),
    })),
    education: (body.education || []).slice(0, 3).map((e) => ({
      degree: stripHtml(e.degree || '').slice(0, 100),
      institution: stripHtml(e.institution || '').slice(0, 100),
      year: stripHtml(e.year || '').slice(0, 20),
      grade: e.grade ? stripHtml(e.grade).slice(0, 40) : undefined,
    })),
    template: (() => {
      const allowed = ['minimal', 'bold', 'creative', 'developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity']
      return allowed.includes(body.template || '') ? (body.template as string) : 'minimal'
    })(),
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (isIpRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Verify auth — create a server-side supabase client using the request cookies
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const supabaseAdmin = getSupabaseAdmin()

  // ONE GENERATION PER USER — check if portfolio already exists
  const { data: existing } = await supabaseAdmin
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ portfolio_id: existing.id, preview_ready: true })
  }

  let body: Partial<InputData & { avatar_url?: string }>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const avatarUrl = typeof body.avatar_url === 'string' ? body.avatar_url.slice(0, 500) : undefined
  const input = parseInput(body)

  if (!input.name || !input.role || !input.email) {
    return NextResponse.json({ error: 'Name, role, and email are required' }, { status: 400 })
  }

  const titledProjects = input.projects.filter((p) => p.title)
  if (titledProjects.length === 0 && !input.github_url) {
    return NextResponse.json({ error: 'Add at least one project or a GitHub URL' }, { status: 400 })
  }

  // Reject if estimated input tokens exceed 2500
  const promptText = buildGenerationPrompt(input)
  const estimatedTokens = Math.ceil(promptText.length / 4)
  if (estimatedTokens > 2500) {
    return NextResponse.json({ error: 'Input too large' }, { status: 400 })
  }

  let portfolioContent: Record<string, unknown>
  const startTime = Date.now()
  let maxTokens = 1200

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
    })

    const elapsed = Date.now() - startTime

    // SLA tier: degraded if over 8s
    if (elapsed > 8000 && elapsed <= 12000) {
      maxTokens = Math.floor(maxTokens * 0.7)
    }

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response')

    portfolioContent = JSON.parse(raw)
  } catch {
    const elapsed = Date.now() - startTime
    if (elapsed > 12000) {
      // Timeout fallback — use raw user data
      portfolioContent = fallbackContent(input)
    } else {
      // Retry once
      try {
        const retry = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: promptText },
          ],
        })
        const raw = retry.choices[0]?.message?.content
        if (!raw) throw new Error('Empty retry response')
        portfolioContent = JSON.parse(raw)
      } catch {
        portfolioContent = fallbackContent(input)
      }
    }
  }

  // Preserve project image URLs — AI doesn't generate these
  const aiProjects = (portfolioContent.projects as Array<Record<string, unknown>>) || []
  const mergedProjects = aiProjects.map((p, i) => ({
    ...p,
    image_url: input.projects[i]?.image_url || null,
  }))

  // Ensure required fields have fallbacks; preserve education/certifications from user input
  const content = {
    ...fallbackContent(input),
    ...portfolioContent,
    name: input.name,
    role: input.role,
    email: input.email,
    location: input.location,
    github_url: input.github_url || null,
    linkedin_url: input.linkedin_url || null,
    avatar_url: avatarUrl || (portfolioContent.avatar_url as string | undefined) || null,
    projects: mergedProjects,
    // Education/certifications: prefer AI output, fall back to user-provided data
    education: (portfolioContent.education as unknown[] | undefined)?.length
      ? portfolioContent.education
      : input.education?.length ? input.education : undefined,
    certifications: (portfolioContent.certifications as string[] | undefined)?.length
      ? portfolioContent.certifications
      : input.certifications?.length ? input.certifications : undefined,
  }

  const healthScore = calculateHealthScore(content)

  // Save to Supabase
  const { data: portfolio, error: insertError } = await supabaseAdmin
    .from('portfolios')
    .insert({
      user_id: user.id,
      template: input.template,
      content,
      health_score: healthScore,
      seo_title: (content.seo_title as string) || `${input.name} | ${input.role} Portfolio`,
      seo_description: (content.seo_description as string) || `${input.role} portfolio.`,
    })
    .select('id')
    .single()

  if (insertError || !portfolio) {
    return NextResponse.json({ error: 'Failed to save portfolio' }, { status: 500 })
  }

  return NextResponse.json({ portfolio_id: portfolio.id, preview_ready: true })
}

function calculateHealthScore(content: Record<string, unknown>): number {
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
