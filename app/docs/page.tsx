import type { Metadata } from 'next'
import { DOC_GROUPS, DOC_PAGES } from '@/lib/docs/pages'

export const metadata: Metadata = {
  title: 'LivePortfolio documentation',
  description: 'Guides for LivePortfolio: build and publish your portfolio, and edit it from Claude, ChatGPT or Claude Code.',
  alternates: { canonical: '/docs' },
}

export default function Docs() {
  return (
    <main>
      <h1 className="text-3xl font-semibold">LivePortfolio documentation</h1>
      <p className="mt-3 text-lg text-neutral-700">Build a professional portfolio from your CV, publish it at your own address, and keep it up to date by talking to your AI assistant.</p>

      <a href="/docs/connect" className="mt-6 block rounded-2xl border border-neutral-300 p-5 hover:bg-neutral-50">
        <p className="text-sm font-semibold text-[#0A66C2]">New for Pro</p>
        <p className="mt-1 text-xl font-semibold">Your portfolio, powered by your AI assistant</p>
        <p className="mt-1 text-neutral-700">Connect Claude, ChatGPT or Claude Code in a few steps. Every change can be undone, and nothing is removed without your approval.</p>
      </a>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {DOC_GROUPS.map((g) => (
          <section key={g}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{g}</h2>
            <ul className="mt-2 space-y-2">
              {DOC_PAGES.filter((p) => p.group === g).map((p) => (
                <li key={p.slug}><a className="font-medium underline" href={`/docs/${p.slug}`}>{p.title}</a><br /><span className="text-sm text-neutral-600">{p.description}</span></li>
              ))}
              {g === 'AI assistant' && <li><a className="font-medium underline" href="/docs/mcp">Tools reference</a><br /><span className="text-sm text-neutral-600">Every tool, generated from the code.</span></li>}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
