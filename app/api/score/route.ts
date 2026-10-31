import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase'
import { callLLM, LlmError } from '@/lib/llm'
import { entitlements } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const insightSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    presence: z.number().int().min(0).max(25),
    projects: z.number().int().min(0).max(35),
    experience: z.number().int().min(0).max(25),
    skills: z.number().int().min(0).max(15),
  }),
  summary: z.string().min(1).max(220),
  top_strength: z.string().min(1).max(160),
  top_gap: z.string().min(1).max(160),
  portfolio_actions: z.array(z.string().min(1).max(160)).length(3),
  career_actions: z.array(z.string().min(1).max(160)).length(3),
})

type InsightResult = z.infer<typeof insightSchema>

function hasMetric(text?: string | null) {
  return !!text && /\d/.test(text)
}

export async function GET(req: NextRequest) {
  try {
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // FIX 1: Verify Bearer token before any DB access
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Ownership check
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id, content')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single()

    if (!portfolio) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Weekly AI career score is a Pro feature: enforced here, not only in the UI. This route can call the LLM, and
    // free/Basic accounts must never be able to trigger that.
    if (!(await entitlements(userId)).weeklyScore) {
      return NextResponse.json({ error: 'upgrade_required', feature: 'weekly_score' }, { status: 403 })
    }

    // Return cached score if scored within last 7 days
    const { data: cached } = await supabaseAdmin
      .from('career_scores')
      .select('score, breakdown, summary, scored_at')
      .eq('portfolio_id', portfolioId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .single()

    if (cached && Date.now() - new Date(cached.scored_at).getTime() < SEVEN_DAYS_MS) {
      const cachedBreakdown = (cached.breakdown ?? {}) as Record<string, unknown>
      return NextResponse.json({
        score: cached.score,
        breakdown: cachedBreakdown,
        summary: cached.summary,
        top_strength: typeof cachedBreakdown.top_strength === 'string' ? cachedBreakdown.top_strength : '',
        top_gap: typeof cachedBreakdown.top_gap === 'string' ? cachedBreakdown.top_gap : '',
        portfolio_actions: Array.isArray(cachedBreakdown.portfolio_actions) ? cachedBreakdown.portfolio_actions : [],
        career_actions: Array.isArray(cachedBreakdown.career_actions) ? cachedBreakdown.career_actions : [],
        scored_at: cached.scored_at,
        cached: true,
      })
    }

    // Generate new score via the LLM gateway (PII redacted before the call, restored after)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })
    }

    const c = portfolio.content as {
      name?: string; role?: string; about?: string; skills?: string[]; skills_narrative?: string;
      projects?: { title: string; outcome?: string; stack?: string[]; url?: string; github_url?: string; image_url?: string }[];
      experience?: { company: string; role: string; period: string; bullets?: string[] }[];
      education?: { degree?: string; institution?: string; year?: string }[];
      certifications?: string[];
      github_url?: string; linkedin_url?: string; avatar_url?: string; location?: string; headline?: string;
    }

    const projects = Array.isArray(c.projects) ? c.projects : []
    const experience = Array.isArray(c.experience) ? c.experience : []
    const skills = Array.isArray(c.skills) ? c.skills : []
    const education = Array.isArray(c.education) ? c.education : []
    const certifications = Array.isArray(c.certifications) ? c.certifications : []
    const missing: string[] = []
    if (!c.avatar_url) missing.push('profile photo')
    if (!c.headline) missing.push('headline')
    if (!c.location) missing.push('location')
    if (!c.linkedin_url) missing.push('LinkedIn link')
    if (!c.github_url) missing.push('GitHub link')
    if (projects.length < 3) missing.push('enough projects')
    if (!projects.some((p) => p?.outcome?.trim())) missing.push('project outcomes')
    if (!projects.some((p) => hasMetric(p?.outcome))) missing.push('quantified project outcomes')
    if (experience.length === 0) missing.push('experience section')
    if (skills.length < 5) missing.push('enough skills')

    const prompt = `You are generating a weekly personalized career insight for a professional portfolio.

Your output must be stable, practical, and repeatable. Do not be poetic. Do not invent achievements. Base every recommendation only on the portfolio data below.

Portfolio facts:
- Role: ${c.role || 'Unknown'}
- Headline present: ${c.headline ? 'yes' : 'no'}
- Location present: ${c.location ? 'yes' : 'no'}
- Avatar present: ${c.avatar_url ? 'yes' : 'no'}
- LinkedIn present: ${c.linkedin_url ? 'yes' : 'no'}
- GitHub present: ${c.github_url ? 'yes' : 'no'}
- About length: ${(c.about || '').split(/\s+/).filter(Boolean).length} words
- Skills count: ${skills.length}
- Skills: ${skills.join(', ') || 'none'}
- Skills summary present: ${c.skills_narrative ? 'yes' : 'no'}
- Projects count: ${projects.length}
- Projects with outcomes: ${projects.filter((p) => p?.outcome?.trim()).length}
- Projects with quantified outcomes: ${projects.filter((p) => hasMetric(p?.outcome)).length}
- Projects with links: ${projects.filter((p) => p?.url || p?.github_url).length}
- Projects with images: ${projects.filter((p) => p?.image_url).length}
- Experience count: ${experience.length}
- Experience entries with at least 2 bullets: ${experience.filter((e) => Array.isArray(e?.bullets) && e.bullets.filter((b) => b?.trim()).length >= 2).length}
- Education count: ${education.length}
- Certifications count: ${certifications.length}
- Missing elements: ${missing.join(', ') || 'none'}

Project details:
${projects.map((p, i) => `${i + 1}. ${p.title || 'Untitled'} | outcome: ${p.outcome || 'none'} | stack: ${(p.stack || []).join(', ') || 'none'} | link: ${p.url || p.github_url ? 'yes' : 'no'}`).join('\n') || 'none'}

Experience details:
${experience.map((e, i) => `${i + 1}. ${e.role || 'Unknown role'} at ${e.company || 'Unknown company'} (${e.period || 'no period'}) | bullets: ${(e.bullets || []).filter(Boolean).length}`).join('\n') || 'none'}

Return structured JSON only. Keep every string concise and specific. Portfolio actions must be things the user can improve inside this portfolio. Career actions must be broader professional moves outside the portfolio. Prioritize the highest-leverage gaps first.`

    let parsed: InsightResult
    try {
      const result = await callLLM<InsightResult>({
        purpose: 'score.portfolio',
        pii: 'redact',
        system: 'You are a precise career advisor for professional portfolios. Return only valid JSON that matches the schema exactly.',
        input: prompt,
        schema: insightSchema,
        schemaName: 'weekly_portfolio_insight',
        names: c.name ? [c.name] : undefined,
        maxTokens: 500,
        temperature: 0.2,
      })
      parsed = result.data
    } catch (err) {
      if (err instanceof LlmError) {
        return NextResponse.json({ error: 'AI service unavailable' }, { status: 200 })
      }
      throw err
    }

    const score = Math.min(100, Math.max(0, Math.round(parsed.score || 50)))
    const breakdown = parsed.breakdown || { presence: 0, projects: 0, experience: 0, skills: 0 }
    const summary = parsed.summary || 'Add quantified outcomes to your projects to stand out.'
    const topStrength = parsed.top_strength || 'Your portfolio already shows a clear professional direction.'
    const topGap = parsed.top_gap || 'Your strongest next step is to add clearer proof of impact.'
    const portfolioActions = parsed.portfolio_actions || []
    const careerActions = parsed.career_actions || []
    const storedBreakdown = {
      ...breakdown,
      top_strength: topStrength,
      top_gap: topGap,
      portfolio_actions: portfolioActions,
      career_actions: careerActions,
    }

    await supabaseAdmin.from('career_scores').insert({
      portfolio_id: portfolioId,
      score,
      breakdown: storedBreakdown,
      summary,
    })

    return NextResponse.json({
      score,
      breakdown: storedBreakdown,
      summary,
      top_strength: topStrength,
      top_gap: topGap,
      portfolio_actions: portfolioActions,
      career_actions: careerActions,
      scored_at: new Date().toISOString(),
      cached: false,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
