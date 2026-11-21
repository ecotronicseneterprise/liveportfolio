import fs from 'node:fs'
import path from 'node:path'
import CopyButton from '@/components/docs/CopyButton'
import { CLAUDE_ADD_LINK, type ConnectClient, type GuideImage } from '@/lib/docs/connect'
import FirstMessage from '@/components/docs/FirstMessage'

// One guide component for every assistant, so Claude and ChatGPT cannot drift apart. Screenshots come from public/connect/;
// until a file exists nothing is shown (no placeholder).
const hasImage = (file: string) => fs.existsSync(path.join(process.cwd(), 'public', 'connect', file))

function Shot({ image }: { image: GuideImage }) {
  if (hasImage(image.file)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/connect/${image.file}`} alt={image.alt} loading="lazy" className="mt-3 w-full rounded-2xl border border-neutral-200" />
  }
  return null // no screenshot yet: show nothing (it appears automatically once the file is in public/connect/)
}

export default function ConnectGuide({ client: c }: { client: ConnectClient }) {
  return (
    <main>
      <p className="text-sm font-semibold text-neutral-500"><a href="/docs/connect">Connect your AI assistant</a></p>
      <h1 className="mt-1 text-3xl font-semibold">Connect {c.name}</h1>
      <p className="mt-2 text-lg text-neutral-700">{c.blurb}</p>
      <p className="mt-2 text-sm text-neutral-600">The assistant connection is included with the Pro plan.</p>

      {c.oneClick && (
        <a href={CLAUDE_ADD_LINK} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0A66C2] px-6 text-base font-semibold text-white hover:bg-[#084D9A] sm:w-auto">Add to Claude</a>
      )}
      {c.commands && (
        <div className="mt-5 space-y-3">
          {c.commands.map((k) => (
            <div key={k.label}>
              <p className="text-sm font-medium">{k.label}</p>
              <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"><code className="min-w-0 break-all text-xs">{k.text}</code><CopyButton text={k.text} label="Copy" /></div>
            </div>
          ))}
        </div>
      )}

      <ol className="mt-8 space-y-10">
        {c.steps.map((s, i) => (
          <li key={s.title}>
            <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-sm font-bold text-white">{i + 1}</span>{s.title}</h2>
            {s.paragraphs.map((p) => <p key={p} className="mt-2 text-neutral-800">{p}</p>)}
            {s.fields && (
              <dl className="mt-3 space-y-2">
                {s.fields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <div className="min-w-0"><dt className="text-xs text-neutral-500">{f.label}</dt><dd className="break-all text-sm font-medium">{f.value}</dd></div>
                    {f.copy && <CopyButton text={f.value} label="Copy" />}
                  </div>
                ))}
              </dl>
            )}
            {s.note && <p className="mt-2 text-sm text-neutral-600">{s.note}</p>}
            <Shot image={s.image} />
            {s.details && (
              <details className="mt-3 rounded-xl border border-neutral-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold">{s.details.summary}</summary>
                <p className="mt-2 text-sm text-neutral-700">{s.details.text}</p>
                <Shot image={s.details.image} />
              </details>
            )}
          </li>
        ))}
        <li>
          <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">&#10003;</span>Done: start your first chat</h2>
          <p className="mt-2 text-neutral-800">Open a new chat and paste this as your first message.</p>
          <div className="mt-2"><FirstMessage /></div>
        </li>
      </ol>

      {c.note && <p className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">{c.note}</p>}
      <p className="mt-6 text-sm">Every change can be undone. <a className="underline" href="/docs/safety">What the assistant can and cannot do</a> · <a className="underline" href="/docs/troubleshooting">Troubleshooting</a></p>
    </main>
  )
}
