'use client'

import { useEffect, useState } from 'react'
import CopyButton from '@/components/docs/CopyButton'
import FirstMessage from '@/components/docs/FirstMessage'
import '@/components/landing/landing.css'
import { studioFonts } from '@/components/blocks/looks/fonts-studio'

// "Connect your AI assistant". One thing per state:
//  - not connected: one line, three buttons, the address. Always open.
//  - connected: one collapsed row; expanded shows what to say, a few prompts, the sync line, add another, manage.
//  - free: a short locked preview.
// Setup steps live on /docs/connect/*, not here.
export const MCP_ADDRESS = 'https://liveportfolio.site/mcp'
const SHORT_ADDRESS = 'liveportfolio.site/mcp'
const CLAUDE_LINK = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=LivePortfolio&connectorUrl=${encodeURIComponent(MCP_ADDRESS)}`
const PROMPTS = ['What is new in my career? Check my recent chats and suggest portfolio updates.', 'Tighten my About section. Keep every fact.', 'Undo that last change.']

export interface ConnectedApp { id: string; client_name: string; last_used_at: string | null }

const btnPrimary = 'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A] sm:w-auto'
const btnGhost = 'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:w-auto'

function Buttons() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <a href={CLAUDE_LINK} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Add to Claude</a>
      <a href="/docs/connect/chatgpt" className={btnGhost}>Add to ChatGPT</a>
      <a href="/docs/connect/other" className={btnGhost}>Other assistants</a>
    </div>
  )
}

function AddressRow() {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="min-w-0 truncate text-sm text-gray-700"><span className="text-gray-500">Address: </span>{SHORT_ADDRESS}</span>
      <CopyButton text={MCP_ADDRESS} label="Copy" />
    </div>
  )
}

export default function AssistantCard({ token, isPro, onUpgrade, userId, initialApps }: { token: string; isPro: boolean; onUpgrade: () => void; userId?: string; initialApps?: ConnectedApp[] }) {
  const [apps, setApps] = useState<ConnectedApp[] | null>(initialApps ?? null)
  const [open, setOpen] = useState(false)
  const storeKey = `lp_assistant_card_open:${userId ?? 'me'}`

  useEffect(() => {
    try { setOpen(localStorage.getItem(storeKey) === '1') } catch { /* private window: stays collapsed */ }
  }, [storeKey])

  useEffect(() => {
    if (initialApps || !isPro || !token) return
    let live = true
    fetch('/api/mcp/connections', { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (live) setApps(j.connections ?? []) })
      .catch(() => { if (live) setApps([]) })
    return () => { live = false }
  }, [isPro, token, initialApps])

  const toggle = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(storeKey, next ? '1' : '0') } catch { /* not saved */ }
  }

  const shell = `lpl ${studioFonts} rounded-2xl border border-gray-200 bg-white p-4 sm:p-5`

  if (!isPro) {
    return (
      <section aria-labelledby="assistant-card-title" className={shell}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="assistant-card-title" className="text-base font-semibold text-gray-900">Connect your AI assistant</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#0A66C2]">Pro</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">Tell ChatGPT or Claude your wins. They go on your portfolio.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onUpgrade} className={btnPrimary}>Get Pro</button>
          <a href="/connect" className={btnGhost}>How it works</a>
        </div>
      </section>
    )
  }

  if (apps === null) return <section aria-busy="true" className={shell}><p className="text-sm text-gray-500">AI assistant</p></section>

  if (apps.length === 0) {
    return (
      <section aria-labelledby="assistant-card-title" className={shell}>
        <h2 id="assistant-card-title" className="text-base font-semibold text-gray-900">Connect your AI assistant</h2>
        <p className="mt-1 text-sm text-gray-600">Tell ChatGPT or Claude your wins. They go on your portfolio.</p>
        <div className="mt-3"><Buttons /></div>
        <AddressRow />
        <p className="mt-2 text-xs text-gray-500">Every change can be undone.</p>
      </section>
    )
  }

  const names = apps.map((a) => a.client_name || 'App').join(', ')
  return (
    <section aria-label="AI assistant" className={shell}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
        <span className="min-w-0 text-sm"><span className="font-semibold text-gray-900">AI assistant</span> <span className="text-gray-500">· Connected: {names}</span></span>
        <span className="shrink-0 text-xs font-medium text-[#0A66C2]">{open ? 'Hide ▴' : 'Tap to show ▾'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4 border-t border-gray-100 pt-4">
          <FirstMessage />
          <div>
            <p className="text-sm font-medium text-gray-900">Try asking</p>
            <ul className="mt-1 space-y-2">
              {PROMPTS.map((p) => <li key={p} className="flex items-center justify-between gap-3 text-sm text-gray-800"><span>{p}</span><CopyButton text={p} label="Copy" /></li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Connect another assistant</p>
            <div className="mt-2"><Buttons /></div>
            <AddressRow />
          </div>
          <a className="inline-flex min-h-11 items-center text-sm underline" href="/oauth/connections">Manage connected apps</a>
        </div>
      )}
    </section>
  )
}
