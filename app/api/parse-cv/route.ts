import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// In-memory rate limit: 3 per IP per hour
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({}, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({})

    // Check MIME type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({})
    }

    // Check size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({})
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Dynamic import to avoid issues in edge runtime
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buffer)

    // Cap at 4000 chars to keep token cost low
    const text = parsed.text.slice(0, 4000)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You extract structured professional information from CV text. Return valid JSON only.',
        },
        {
          role: 'user',
          content: `Extract professional information from this CV text and return a JSON object with these fields:
{ "name": string, "role": string, "email": string, "location": string, "bio": string (2-3 sentences summary), "skills": string[] (up to 15), "projects": [{"title": string, "description": string (1-2 sentences), "stack": string[]}] (up to 4), "experience": [{"company": string, "role": string, "period": string, "bullets": string[]}] }

CV TEXT:
${text}`,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return NextResponse.json({})

    const extracted = JSON.parse(content)
    return NextResponse.json(extracted)
  } catch {
    return NextResponse.json({})
  }
}
