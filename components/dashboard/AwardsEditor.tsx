'use client'
// The Awards editor (prizes and placings). Sits next to Certifications. Same limits as the assistant and the save path (lib/portfolio/award-limits),
// live counters, reorder, and removal. A link must be https; the save path drops anything else.
import { AWARD_LIMITS } from '@/lib/portfolio/award-limits'
import type { PortfolioAward } from '@/components/templates/Minimal'
import { FieldCount } from './FieldCount'

const input = 'min-w-0 w-full rounded-xl border border-gray-200 px-4 py-2 text-base'
const btn = 'min-h-[44px] px-3 text-sm'

export default function AwardsEditor({ awards, onChange }: { awards: PortfolioAward[] | undefined; onChange: (next: PortfolioAward[]) => void }) {
  const list = awards ?? []
  const set = (i: number, patch: Partial<PortfolioAward>) => onChange(list.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const move = (i: number, to: number) => {
    if (to < 0 || to >= list.length) return
    const next = [...list]
    const [m] = next.splice(i, 1)
    next.splice(to, 0, m)
    onChange(next)
  }
  return (
    <fieldset id="editor-awards" tabIndex={-1} className="space-y-3">
      <legend className="text-sm font-medium text-gray-700">Awards (optional)</legend>
      <p className="text-xs text-gray-500">Prizes, placings and recognition, for example &ldquo;2nd Place (National)&rdquo;. Both the award and who gave it are needed for it to show.</p>
      {list.map((a, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-gray-200 p-3">
          <div>
            <input aria-label={`Award ${i + 1} title`} placeholder="Award, e.g. 2nd Place (National)" value={a.title ?? ''} maxLength={AWARD_LIMITS.title} className={input} onChange={(e) => set(i, { title: e.target.value })} />
          </div>
          <div>
            <input aria-label={`Award ${i + 1} given by`} placeholder="Given by, e.g. CODET National Engineering Competition" value={a.issuer ?? ''} maxLength={AWARD_LIMITS.issuer} className={input} onChange={(e) => set(i, { issuer: e.target.value })} />
          </div>
          <div>
            <input aria-label={`Award ${i + 1} year`} placeholder="Year (optional)" value={a.year ?? ''} maxLength={AWARD_LIMITS.year} className={input} onChange={(e) => set(i, { year: e.target.value })} />
          </div>
          <div>
            <textarea aria-label={`Award ${i + 1} description`} placeholder="One line of context (optional)" value={a.description ?? ''} rows={2} className={`${input} resize-none`} onChange={(e) => set(i, { description: e.target.value })} />
            <FieldCount value={a.description} limit={AWARD_LIMITS.description} />
          </div>
          <div>
            <input aria-label={`Award ${i + 1} link`} type="url" placeholder="https:// link (optional)" value={a.url ?? ''} maxLength={AWARD_LIMITS.url} className={input} onChange={(e) => set(i, { url: e.target.value })} />
            {a.url && !a.url.trim().startsWith('https://') && <p className="mt-1 text-xs text-red-600">The link must start with https:// or it will not be saved.</p>}
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" aria-label={`Move award ${i + 1} up`} disabled={i === 0} className={`${btn} text-gray-700 disabled:opacity-40`} onClick={() => move(i, i - 1)}>Up</button>
            <button type="button" aria-label={`Move award ${i + 1} down`} disabled={i === list.length - 1} className={`${btn} text-gray-700 disabled:opacity-40`} onClick={() => move(i, i + 1)}>Down</button>
            <button type="button" aria-label={`Remove award ${i + 1}`} className={`${btn} text-red-700`} onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" disabled={list.length >= AWARD_LIMITS.max} className="min-h-[44px] text-sm font-medium text-blue-700 disabled:opacity-40" onClick={() => onChange([...list, { title: '', issuer: '' }])}>
        Add award{list.length >= AWARD_LIMITS.max ? ` (limit ${AWARD_LIMITS.max} reached)` : ''}
      </button>
    </fieldset>
  )
}
