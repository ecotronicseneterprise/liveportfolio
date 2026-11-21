import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LivePortfolio documentation',
  description: 'Guides for LivePortfolio, including how to connect your AI assistant.',
  alternates: { canonical: '/docs' },
}

export default function Docs() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-neutral-900">
      <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
      <h1 className="mt-2 text-3xl font-semibold">Documentation</h1>
      <ul className="mt-6 space-y-3">
        <li><a className="text-lg font-medium underline" href="/docs/mcp">Connect your AI assistant</a><br /><span className="text-neutral-600">Edit your portfolio from Claude, ChatGPT or Claude Code. Setup, safety and every tool.</span></li>
        <li><a className="text-lg font-medium underline" href="/portfolio-for">Portfolio for your profession</a><br /><span className="text-neutral-600">What to put on a portfolio for twelve kinds of work.</span></li>
        <li><a className="text-lg font-medium underline" href="/llms.txt">llms.txt</a><br /><span className="text-neutral-600">A plain-text summary for AI agents.</span></li>
      </ul>
    </main>
  )
}
