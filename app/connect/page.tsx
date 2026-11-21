import type { Metadata } from 'next'
import CopyButton from '@/components/docs/CopyButton'
import SansShell from '@/components/landing/SansShell'
import { FIRST_CHAT_MESSAGE, FIRST_CHAT_NOTE, SYNC_INSTRUCTION, SYNC_NOTE } from '@/lib/docs/sync'

export const metadata: Metadata = {
  title: 'Connect Claude or ChatGPT to your portfolio',
  description: 'Update your LivePortfolio by chatting. Connect Claude or ChatGPT in three steps, then tell it about a new job or certification and it is added.',
  alternates: { canonical: '/connect' },
}

const URL_ = 'https://liveportfolio.site/mcp'
const CLAUDE_LINK = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=LivePortfolio&connectorUrl=${encodeURIComponent(URL_)}`

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-neutral-200 p-5">
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-sm font-bold text-white">{n}</span>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
    <div className="mt-3 space-y-3 text-neutral-800">{children}</div>
  </section>
)

export default function ConnectPage() {
  return (
    <SansShell>
    <main className="mx-auto max-w-2xl px-4 py-10 text-neutral-900">
      <a href="/" className="text-sm font-semibold text-neutral-500">LivePortfolio</a>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Update your portfolio by chatting</h1>
      <p className="mt-3 text-lg text-neutral-700">
        Connect Claude or ChatGPT once. Then tell it about a new job or certification and it is added to your portfolio. Every change can be undone, and nothing is removed without your approval.
      </p>
      <p className="mt-2 text-sm text-neutral-600">Included with Pro. You need a Claude or ChatGPT account.</p>

      <div className="mt-6 rounded-2xl border-2 border-[#0A66C2] bg-blue-50 p-5">
        <p className="text-sm font-bold text-[#0A66C2]">After connecting: your first message</p>
        <p className="mt-1 text-lg font-semibold">Start a new chat with this</p>
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-white p-3">
          <span className="whitespace-pre-line text-base">{FIRST_CHAT_MESSAGE}</span>
          <CopyButton text={FIRST_CHAT_MESSAGE} label="Copy" />
        </div>
        <p className="mt-2 text-sm text-neutral-700">{FIRST_CHAT_NOTE}</p>
        <p className="mt-4 text-sm font-semibold">Make it permanent (optional)</p>
        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="text-sm">{SYNC_INSTRUCTION}</span><CopyButton text={SYNC_INSTRUCTION} label="Copy" /></div>
        <p className="mt-1 text-sm text-neutral-700">{SYNC_NOTE}</p>
      </div>

      <div className="mt-8 space-y-5">
        <Step n={1} title="Copy your connection address">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <code className="min-w-0 break-all text-base">{URL_}</code>
            <CopyButton text={URL_} label="Copy" />
          </div>
        </Step>

        <Step n={2} title="Add it to your assistant">
          <div id="claude" className="rounded-xl bg-neutral-50 p-4">
            <p className="font-semibold">Claude</p>
            <a href={CLAUDE_LINK} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-12 items-center rounded-full bg-[#0A66C2] px-6 text-base font-semibold text-white hover:bg-[#084D9A]">Add to Claude</a>
            <p className="mt-2 text-sm text-neutral-600">It opens Claude with everything filled in. Press Add, then Connect, sign in to LivePortfolio and approve.</p>
            <p className="mt-1 text-sm text-neutral-600">Button not working? In Claude open Customize, then Connectors, then Add custom connector, and paste the address.</p>
          </div>
          <div id="chatgpt" className="rounded-xl bg-neutral-50 p-4">
            <p className="font-semibold">ChatGPT</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>Open ChatGPT Settings, then Connectors (or Plugins).</li>
              <li>Choose Add custom connector and paste the address.</li>
              <li>Choose OAuth if asked, press Connect, sign in to LivePortfolio and approve.</li>
            </ol>
            <p className="mt-2 text-sm text-neutral-600">If you do not see the option, your ChatGPT plan or workspace may not allow custom connectors yet. Claude works on more plans.</p>
          </div>
        </Step>

        <Step n={3} title="Start chatting">
          <p>Open a new chat and paste the first message from the box above. Then tell your assistant what happened in your career, in your own words.</p>
          <p className="text-sm text-neutral-600">It adds only what you tell it and asks if something is missing. Say &quot;undo that&quot; any time.</p>
        </Step>
      </div>

      <div className="mt-8 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700">
        <p className="font-semibold text-neutral-900">You stay in control</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>It can never publish, delete your account or touch billing.</li>
          <li>Removing things, links and big rewrites wait for your approval.</li>
          <li>Your email and phone stay hidden unless you allow them.</li>
          <li>Disconnect any time at <a className="underline" href="/oauth/connections">Connected apps</a>.</li>
        </ul>
        <p className="mt-3">More help: <a className="underline" href="/docs/connect">full guide</a> · <a className="underline" href="/docs/troubleshooting">troubleshooting</a>. Developers: <a className="underline" href="/docs/mcp">tools reference</a>.</p>
      </div>

      <p className="mt-8 text-center"><a href="/dashboard" className="inline-flex min-h-12 items-center rounded-full border border-neutral-300 px-6 font-semibold hover:bg-neutral-50">Go to my dashboard</a></p>
    </main>
    </SansShell>
  )
}
