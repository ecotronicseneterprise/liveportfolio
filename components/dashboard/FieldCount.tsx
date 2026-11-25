'use client'
// Live counters under the editor's text boxes, and one quiet notice when part of what is saved is not shown in full. No AI and no network:
// both read the same limits and the same check (lib/blocks/display) the public page and the assistant use.
import { displayNotices, displayReport } from '@/lib/blocks/display'
import type { PortfolioContent } from '@/components/templates/Minimal'

const nf = (n: number) => n.toLocaleString('en')

/** "320 / 1,500 characters, 54 words". Over the limit it says what happens; within it, it says the page shows the text in full. */
export function FieldCount({ value, limit }: { value: string | undefined; limit: number }) {
  const text = (value ?? '').trim()
  const length = text.length
  const words = text ? text.split(/\s+/).length : 0
  const over = length - limit
  return (
    <p className={`mt-1 text-xs ${over > 0 ? 'text-red-600' : 'text-gray-500'}`} aria-live="polite">
      {nf(length)} / {nf(limit)} characters, {nf(words)} {words === 1 ? 'word' : 'words'}
      {over > 0 ? `. ${nf(over)} too many: the extra will not be saved.` : length > 0 ? '. Shown in full on your page.' : ''}
    </p>
  )
}

/** Lines of a bullet box: how many, the longest, and what each line may be. */
export function BulletCount({ lines }: { lines: string[] | undefined }) {
  const items = (lines ?? []).map((x) => x.trim()).filter(Boolean)
  const longest = Math.max(0, ...items.map((x) => x.length))
  const bad = items.length > 12 || longest > 400
  return (
    <p className={`mt-1 text-xs ${bad ? 'text-red-600' : 'text-gray-500'}`} aria-live="polite">
      {items.length} / 12 lines, longest {nf(longest)} / 400 characters
      {items.length > 12 ? `. ${items.length - 12} extra line(s) will not be saved.` : longest > 400 ? '. A line is too long and will not be saved.' : items.length ? '. All shown on your page.' : ''}
    </p>
  )
}

/** Only appears when something is cut, left out or folded on a phone. */
export function DisplayNotice({ content, template }: { content: Partial<PortfolioContent>; template?: string }) {
  const rows = displayNotices(displayReport(content, template))
  if (!rows.length) return null
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
      <p className="font-medium">Some of what you saved is not shown in full</p>
      <ul className="mt-1 list-disc pl-5 space-y-1">
        {rows.map((r) => (
          <li key={r.section}>
            <span className="capitalize">{r.section}</span>: {r.shown} of {r.total} shown
            {r.folded_on_phone ? `, ${r.folded_on_phone} behind a "Show more" button on a phone` : ''}
            {r.note ? `. ${r.note}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
