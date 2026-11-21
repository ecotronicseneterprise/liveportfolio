import { llmsTxt } from '@/lib/mcp/docs'
import { DOC_PAGES } from '@/lib/docs/pages'
import { CONNECT_CLIENTS } from '@/lib/docs/connect'

export const dynamic = 'force-static'

export function GET() {
  return new Response(llmsTxt() + '\n## All documentation pages\n' + DOC_PAGES.map((p) => `- [${p.title}](https://liveportfolio.site/docs/${p.slug}): ${p.description}`).join('\n') + '\n' + CONNECT_CLIENTS.map((k) => `- [Connect ${k.name}](https://liveportfolio.site/docs/connect/${k.slug}): ${k.blurb}`).join('\n') + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
