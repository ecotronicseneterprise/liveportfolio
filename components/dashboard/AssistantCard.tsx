'use client'

import { useEffect, useState } from 'react'
import CopyButton from '@/components/docs/CopyButton'

// "Connect your AI assistant": the address to copy, the steps for each app, live connected status, and starter prompts.
// Pro accounts get the working card; others see what it does and the way to get it.
const URL_ = 'https://liveportfolio.site/mcp'
const PROMPTS = ['Read my portfolio and tell me the three most useful things to improve.', 'Tighten my About section. Keep every fact.', 'Fix the typos in my portfolio.', 'Undo that last change.']

export default function AssistantCard({ token, isPro, onUpgrade }: { token: string; isPro: boolean; onUpgrade: () => void }) {
  const [apps, setApps] = useState<Array<{ id: string; client_name: string; last_used_at: string | null }> | null>(null)

  useEffect(() => {
    if (!isPro || !token) return
    let live = true
    fetch('/api/mcp/connections', { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (live) setApps(j.connections ?? []) })
      .catch(() => { if (live) setApps([]) })
    return () => { live = false }
  }, [isPro, token])

  return (
    <section aria-labelledby="assistant-card-title" className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="assistant-card-title" className="text-base font-semibold text-gray-900">Connect your AI assistant</h2>
        {isPro && apps !== null && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${apps.length ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
            {apps.length ? `Connected: ${apps.map((a) => a.client_name || 'App').join(', ')}` : 'Not connected yet'}
          </span>
        )}
        {!isPro && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0A66C2]">Pro</span>}
      </div>
      <p className="mt-1 text-sm text-gray-600">Edit your portfolio from Claude or ChatGPT: &ldquo;tighten my About&rdquo;, &ldquo;add my new job&rdquo;, &ldquo;undo that&rdquo;. Every change is saved as a version you can undo, and nothing is removed without your approval.</p>

      {isPro ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <code className="min-w-0 break-all text-sm">{URL_}</code>
            <CopyButton text={URL_} label="Copy address" />
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-gray-800">
            <li><strong>Claude:</strong> Customize, Connectors, Add custom connector, paste the address.</li>
            <li><strong>ChatGPT:</strong> Settings, Connectors, add a custom connector with the address (developer mode may be needed).</li>
            <li><strong>Claude Code:</strong> <span className="inline-flex flex-wrap items-center gap-2"><code className="break-all text-xs">claude mcp add --transport http liveportfolio {URL_}</code><CopyButton text={`claude mcp add --transport http liveportfolio ${URL_}`} label="Copy command" /></span></li>
          </ol>
          <p className="mt-2 text-sm text-gray-600">Then choose Connect, sign in, and approve. You choose whether it may edit and whether it sees your contact details.</p>
          <p className="mt-4 text-sm font-medium text-gray-900">Try asking</p>
          <ul className="mt-1 space-y-2">
            {PROMPTS.map((p) => (
              <li key={p} className="flex items-center justify-between gap-3 text-sm text-gray-800"><span>{p}</span><CopyButton text={p} /></li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <a className="inline-flex min-h-9 items-center underline" href="/docs/connect">Full guide</a>
            <a className="inline-flex min-h-9 items-center underline" href="/docs/safety">Safety</a>
            <a className="inline-flex min-h-9 items-center underline" href="/oauth/connections">Connected apps</a>
          </p>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-700">The assistant connection is included with the Pro plan. It can read your portfolio, edit text, add projects and jobs, change designs and add pictures. It can never publish, delete or touch billing.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={onUpgrade} className="min-h-11 rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A]">Get Pro</button>
            <a className="inline-flex min-h-11 items-center text-sm underline" href="/docs/connect">How it works</a>
          </div>
        </div>
      )}
    </section>
  )
}
