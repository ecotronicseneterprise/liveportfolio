import type { Metadata } from 'next'
import { CANNOT, CONNECT_STEPS, EXAMPLES, MCP_URL, toolsReference } from '@/lib/mcp/docs'

export const metadata: Metadata = {
  title: 'Connect your AI assistant to LivePortfolio',
  description: 'Let Claude, ChatGPT or Claude Code read and edit your portfolio. Setup steps, what the assistant can and cannot do, and every tool.',
  alternates: { canonical: '/docs/mcp' },
}

const Steps = ({ items }: { items: string[] }) => (
  <ol className="mt-3 list-decimal space-y-2 pl-6">{items.map((s) => <li key={s}>{s}</li>)}</ol>
)

export default function McpDocs() {
  const tools = toolsReference()
  return (
    <main>
      <p className="text-sm font-semibold tracking-wide text-neutral-500"><a href="/docs">Docs</a> / Assistant connection</p>
      <h1 className="mt-2 text-3xl font-semibold">Your portfolio, powered by your AI assistant</h1>
      <p className="mt-4 text-lg text-neutral-700">
        Connect LivePortfolio to Claude, ChatGPT or Claude Code and ask for changes in plain words. The assistant edits your real portfolio through the tools below. Every edit is saved as a version you can undo.
      </p>
      <p className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Server address: <code className="break-all">{MCP_URL}</code>. It uses OAuth 2.1 with PKCE and the MCP Streamable HTTP transport. Availability may be limited while the connection rolls out.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">Connect</h2>
      <h3 className="mt-5 text-lg font-semibold">Claude (web, desktop, phone)</h3>
      <Steps items={CONNECT_STEPS.claude} />
      <h3 className="mt-5 text-lg font-semibold">ChatGPT</h3>
      <Steps items={CONNECT_STEPS.chatgpt} />
      <h3 className="mt-5 text-lg font-semibold">Claude Code</h3>
      <Steps items={CONNECT_STEPS.claudeCode} />

      <h2 className="mt-10 text-2xl font-semibold">Things to ask</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">{EXAMPLES.map((e) => <li key={e}>{e}</li>)}</ul>

      <h2 className="mt-10 text-2xl font-semibold">What it can never do</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">{CANNOT.map((e) => <li key={e}>{e}</li>)}</ul>
      <p className="mt-3 text-neutral-700">These are not tools, so no instruction, however it is worded, can make the assistant do them.</p>

      <h2 className="mt-10 text-2xl font-semibold">Safety</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><strong>Undo.</strong> Each change is a saved version. Say &quot;undo that&quot; or use History in your dashboard.</li>
        <li><strong>Your approval for big changes.</strong> Removing a project or job, replacing a whole list, batches and restoring an old version are not applied by the assistant. It gives you a link; you approve on liveportfolio.site.</li>
        <li><strong>Contact details are private by default.</strong> Your email, phone and WhatsApp are hidden from the assistant unless you allow them when connecting.</li>
        <li><strong>Read-only option.</strong> Turn off &quot;Allow edits&quot; when connecting to let the assistant read only.</li>
        <li><strong>Disconnect any time</strong> at <a className="underline" href="/oauth/connections">Connected apps</a>. The next call from that app is refused.</li>
        <li><strong>Pictures</strong> are checked and re-encoded; the assistant gives you a private one-time upload link, or fetches a public https picture safely.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold">Tools</h2>
      <p className="mt-2 text-neutral-700">{tools.length} tools. The assistant chooses them for you; this list is for developers and curious people.</p>
      <div className="mt-4 space-y-4">
        {tools.map((t) => (
          <section key={t.name} id={t.name} className="rounded-2xl border border-neutral-200 p-4">
            <h3 className="font-mono text-base font-semibold">{t.name}</h3>
            <p className="text-sm text-neutral-500">{t.title} · {t.kindLabel}</p>
            <p className="mt-2 text-neutral-800">{t.description}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
