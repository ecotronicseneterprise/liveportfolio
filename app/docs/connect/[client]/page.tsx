import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CopyButton from '@/components/docs/CopyButton'
import { CLAUDE_ADD_LINK, CONNECT_CLIENTS, clientBySlug } from '@/lib/docs/connect'
import { MCP_URL } from '@/lib/mcp/docs'

export const dynamicParams = false
export const generateStaticParams = () => CONNECT_CLIENTS.map((c) => ({ client: c.slug }))

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }): Promise<Metadata> {
  const c = clientBySlug((await params).client)
  if (!c) return {}
  return { title: `Connect ${c.name} to LivePortfolio`, description: c.blurb, alternates: { canonical: `/docs/connect/${c.slug}` } }
}

export default async function ConnectClientPage({ params }: { params: Promise<{ client: string }> }) {
  const c = clientBySlug((await params).client)
  if (!c) notFound()
  return (
    <main>
      <p className="text-sm font-semibold text-neutral-500"><a href="/docs/connect">Connect your AI assistant</a></p>
      <h1 className="mt-1 text-3xl font-semibold">Connect {c.name}</h1>
      <p className="mt-2 text-lg text-neutral-700">{c.blurb}</p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <span className="min-w-0 truncate text-sm"><span className="text-neutral-500">Address: </span>{MCP_URL.replace('https://', '')}</span>
        <CopyButton text={MCP_URL} label="Copy address" />
      </div>
      {c.slug === 'claude' && (
        <a href={CLAUDE_ADD_LINK} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0A66C2] px-6 text-base font-semibold text-white hover:bg-[#084D9A] sm:w-auto">Add to Claude</a>
      )}
      {c.command && (
        <div className="mt-4 space-y-3">
          {c.command.map((k) => (
            <div key={k.label}>
              <p className="text-sm font-medium">{k.label}</p>
              <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"><code className="min-w-0 break-all text-xs">{k.text}</code><CopyButton text={k.text} label="Copy" /></div>
            </div>
          ))}
        </div>
      )}

      <ol className="mt-8 space-y-8">
        {c.steps.map((s, i) => (
          <li key={s.title}>
            <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-sm font-bold text-white">{i + 1}</span>{s.title}</h2>
            <p className="mt-2 text-neutral-800">{s.body}</p>
            {/* screenshot slot: replace with <img src="/docs/connect/{s.image}"> once a screenshot with invented data exists */}
            <div role="img" aria-label={s.alt} className="mt-3 flex aspect-video w-full items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 text-center text-sm text-neutral-500">Screenshot: {s.alt}</div>
          </li>
        ))}
      </ol>
      {c.note && <p className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">{c.note}</p>}
      <p className="mt-6 text-sm">Every change can be undone. <a className="underline" href="/docs/safety">What the assistant can and cannot do</a> · <a className="underline" href="/docs/troubleshooting">Troubleshooting</a></p>
    </main>
  )
}
