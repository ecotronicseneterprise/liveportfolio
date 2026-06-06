import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
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

    // Return cached score if scored within last 7 days
    const { data: cached } = await supabaseAdmin
      .from('career_scores')
      .select('score, breakdown, summary, scored_at')
      .eq('portfolio_id', portfolioId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .single()

    if (cached && Date.now() - new Date(cached.scored_at).getTime() < SEVEN_DAYS_MS) {
      return NextResponse.json({
        score: cached.score,
        breakdown: cached.breakdown,
        summary: cached.summary,
        scored_at: cached.scored_at,
        cached: true,
      })
    }

    // Generate new score via GPT-4o-mini
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })
    }

    const c = portfolio.content as {
      name?: string; role?: string; about?: string; skills?: string[];
      projects?: { title: string; outcome?: string }[];
      experience?: { company: string; role: string; period: string; bullets?: string[] }[];
      github_url?: string; linkedin_url?: string; avatar_url?: string;
    }

    const prompt = `Score this professional portfolio on a 0–100 scale across four dimensions.

Name: ${c.name || 'Unknown'}
Role: ${c.role || 'Unknown'}
About: ${c.about || ''}
Skills: ${(c.skills || []).join(', ')}
Projects: ${(c.projects || []).map((p) => `${p.title} — ${p.outcome || ''}`).join(' | ')}
Experience: ${(c.experience || []).map((e) => `${e.role} at ${e.company} (${e.period})`).join(' | ')}
Has GitHub: ${c.github_url ? 'yes' : 'no'}
Has LinkedIn: ${c.linkedin_url ? 'yes' : 'no'}
Has avatar: ${c.avatar_url ? 'yes' : 'no'}

Return JSON with this exact shape:
{
  "score": <overall 0-100>,
  "breakdown": {
    "presence": <0-25, online presence completeness>,
    "projects": <0-35, project quality, outcomes with numbers, impact>,
    "experience": <0-25, relevance and progression>,
    "skills": <0-15, breadth and relevance to role>
  },
  "summary": "<one sentence of the single most impactful improvement they could make>"
}

Be honest and calibrated. A score of 72 is good. 90+ requires standout outcomes with real numbers.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a career advisor scoring professional portfolios. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 200 })
    }

    const aiResult = await response.json()
    const parsed = JSON.parse(aiResult.choices[0].message.content)

    const score = Math.min(100, Math.max(0, Math.round(parsed.score || 50)))
    const breakdown = parsed.breakdown || { presence: 0, projects: 0, experience: 0, skills: 0 }
    const summary = parsed.summary || 'Add quantified outcomes to your projects to stand out.'

    // Persist to career_scores
    await supabaseAdmin.from('career_scores').insert({
      portfolio_id: portfolioId,
      score,
      breakdown,
      summary,
    })

    return NextResponse.json({ score, breakdown, summary, scored_at: new Date().toISOString(), cached: false })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
