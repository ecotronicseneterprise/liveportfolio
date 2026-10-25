// Last line of defence for what visitors see. Every write path already refuses non-http(s) links (lib/portfolio/ops.ts, the draft and generate
// routes), but the public page should not depend on that: before a portfolio is drawn, any link that is not a plain http(s) address is dropped,
// so a stored `javascript:` link can never become a clickable one. Pure: it returns a copy and never mutates what it was given.
import { httpUrl } from '@/lib/connectors/safe-url'

type Json = Record<string, unknown>

const LINKS = ['github_url', 'linkedin_url', 'twitter_url', 'instagram_url', 'facebook_url', 'youtube_url', 'tiktok_url', 'url', 'live_url', 'repo_url', 'website_url', 'avatar_url', 'image_url'] as const

function cleanLinks<T extends Json>(o: T): T {
  const out: Json = { ...o }
  for (const k of LINKS) {
    if (typeof out[k] === 'string' && out[k] !== '') {
      const ok = httpUrl(out[k], 500)
      if (ok) out[k] = out[k]
      else delete out[k]
    }
  }
  return out as T
}

export function safeContent<T extends Json>(content: T): T {
  const out: Json = cleanLinks(content)
  for (const key of ['projects', 'experience', 'education'] as const) {
    if (Array.isArray(out[key])) out[key] = (out[key] as unknown[]).map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? cleanLinks(x as Json) : x))
  }
  return out as T
}
