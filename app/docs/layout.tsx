import type { ReactNode } from 'react'
import { DOC_GROUPS, DOC_PAGES } from '@/lib/docs/pages'
import SansShell from '@/components/landing/SansShell'

// Docs shell: a sidebar on wide screens, a plain list on top on phones. Every page also points agents to /llms.txt.
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SansShell>
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-neutral-900 lg:flex-row lg:gap-10">
      <nav aria-label="Documentation" className="lg:sticky lg:top-6 lg:h-fit lg:w-60 lg:shrink-0">
        <a href="/" className="text-sm font-semibold text-neutral-500">LivePortfolio</a>
        <a href="/docs" className="mt-2 block text-lg font-semibold">Documentation</a>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {DOC_GROUPS.map((g) => (
            <div key={g}>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{g}</p>
              <ul className="mt-1">
                {DOC_PAGES.filter((p) => p.group === g).map((p) => (
                  <li key={p.slug}><a className="inline-flex min-h-9 items-center text-sm hover:underline" href={`/docs/${p.slug}`}>{p.title}</a></li>
                ))}
                {g === 'AI assistant' && <li><a className="inline-flex min-h-9 items-center text-sm hover:underline" href="/docs/mcp">Tools reference</a></li>}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0 flex-1">
        <p className="mb-4 text-xs text-neutral-500">For AI agents: the documentation index is at <a className="underline" href="/llms.txt">/llms.txt</a>.</p>
        {children}
      </div>
    </div>
    </SansShell>
  )
}
