'use client'

import { useMemo } from 'react'
import { TemplateThumb } from '@/components/onboarding/TemplateGallery'
import { TEMPLATE_LABEL } from '@/components/templates/dynamic'
import { THEME_BY_TEMPLATE, isLookTemplate, recommend } from '@/lib/blocks/presets'
import { ACCENTS, ACCENT_IDS, ARRANGEMENTS, DENSITIES, type AccentId, type Arrangement, type Density, type LayoutSettings } from '@/lib/blocks/settings'
import type { StoredContent } from '@/lib/blocks/mode'
import { PRO_TEMPLATES, type TemplateId } from '@/lib/plans'
import { t } from '@/lib/onboarding/t'
import { usesProDesign } from '@/lib/portfolio/presentation'

const FREE_LOOKS = ['creative', 'minimal', 'bold'] as const // Studio, Journal, Ledger
const seg = 'inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'
const on = 'border-[#0A66C2] bg-[#E8F0F9] text-[#084D9A]'
const off = 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'

/**
 * Choose the look of the portfolio and adjust it. Everything here is a choice from a fixed list (no free colour, font or CSS), stored as the
 * `layout` field of the portfolio content and saved through the normal Save button, so History and undo cover it. Previews are the real
 * renderer drawing the person's own words.
 */
export default function LookPicker({
  content, template, isPro, onChange, onLocked,
}: {
  content: StoredContent
  template: string
  isPro: boolean
  onChange: (next: { template?: string; layout?: LayoutSettings }) => void
  onLocked: (name: string, id?: TemplateId) => void
}) {
  const layout = (content.layout ?? { v: 1, arrangement: 'profile' }) as LayoutSettings
  const classicActive = !isLookTemplate(template)
  const rec = useMemo(() => recommend(content), [content])
  const setLayout = (patch: Partial<LayoutSettings>) => onChange({ layout: { ...layout, ...patch, v: 1 } })

  return (
    <section aria-labelledby="look-h" className="space-y-6">
      <div>
        <h3 id="look-h" className="text-base font-semibold text-gray-900">{t('lookPicker.title')}</h3>
        <p className="mt-1 text-sm text-gray-700">{t('lookPicker.lede')}</p>
      </div>

      {classicActive && (
        <p role="status" className="rounded-xl bg-[#E8F0F9] px-4 py-3 text-sm text-gray-800">
          {t(usesProDesign(content, template) ? 'lookPicker.redesignActive' : 'lookPicker.classicActive', { name: TEMPLATE_LABEL[template as TemplateId] ?? template })}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.looks')}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FREE_LOOKS.map((id) => {
            const selected = template === id
            const theme = THEME_BY_TEMPLATE[id]
            return (
              <div key={id} className={`rounded-2xl border-2 p-2 ${selected ? 'border-[#0A66C2] bg-[#E8F0F9]' : 'border-gray-200 bg-white'}`}>
                <TemplateThumb id={id} content={content} height={190} />
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ template: id })}
                  className="mt-2 block min-h-[44px] w-full rounded-lg px-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
                >
                  <span className="block text-sm font-semibold text-gray-900">{t(`portfolio.look.${theme}`)}{selected ? <span className="ml-2 text-xs font-medium text-[#084D9A]">{t('lookPicker.selected')}</span> : null}</span>
                  <span className="block text-xs text-gray-700">{t(`portfolio.lookNote.${theme}`)}</span>
                </button>
              </div>
            )
          })}
        </div>
      </fieldset>

      <div hidden={classicActive} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.layout')}</legend>
        <div className="flex flex-wrap gap-2">
          {ARRANGEMENTS.map((a: Arrangement) => (
            <button key={a} type="button" aria-pressed={layout.arrangement === a} className={`${seg} ${layout.arrangement === a ? on : off}`} onClick={() => setLayout({ arrangement: a })}>
              {t(`portfolio.arrangement.${a}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.accent')}</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!layout.accent} className={`${seg} ${!layout.accent ? on : off}`} onClick={() => setLayout({ accent: undefined })}>{t('lookPicker.accentDefault')}</button>
          {ACCENT_IDS.map((id: AccentId) => (
            <button key={id} type="button" aria-pressed={layout.accent === id} className={`${seg} gap-2 ${layout.accent === id ? on : off}`} onClick={() => setLayout({ accent: id })}>
              <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-gray-400" style={{ background: ACCENTS[id].fill }} />
              {t(`lookPicker.accents.${id}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.density')}</legend>
          <div className="flex flex-wrap gap-2">
            {DENSITIES.map((d: Density) => (
              <button key={d} type="button" aria-pressed={(layout.density ?? 'comfortable') === d} className={`${seg} ${(layout.density ?? 'comfortable') === d ? on : off}`} onClick={() => setLayout({ density: d })}>{t(`lookPicker.densities.${d}`)}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.bio')}</legend>
          <div className="flex flex-wrap gap-2">
            {(['long', 'short'] as const).map((b) => (
              <button key={b} type="button" aria-pressed={(layout.bio ?? 'long') === b} className={`${seg} ${(layout.bio ?? 'long') === b ? on : off}`} onClick={() => setLayout({ bio: b })}>{t(`lookPicker.bios.${b}`)}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <button type="button" className={`${seg} ${off}`} onClick={() => onChange({ template: rec.template, layout: rec.layout })}>
          {t('lookPicker.recommended')}: {t(`portfolio.look.${THEME_BY_TEMPLATE[rec.template]}`)}, {t(`portfolio.arrangement.${rec.layout.arrangement}`)}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">{t('lookPicker.livePreview')}</p>
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <TemplateThumb id={template as TemplateId} content={content} height={520} scrollable />
        </div>
      </div>

      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">{t('lookPicker.classic')}</h3>
        <p className="mt-1 text-sm text-gray-700">{t('lookPicker.classicNote')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRO_TEMPLATES.map((id) => {
            const locked = !isPro
            const name = TEMPLATE_LABEL[id]
            return (
              <button
                key={id}
                type="button"
                aria-pressed={template === id}
                aria-label={locked ? `${name}, ${t('lookPicker.proLocked', { name })}` : name}
                className={`${seg} ${template === id ? on : off} ${locked ? 'opacity-80' : ''}`}
                onClick={() => (locked ? onLocked(name, id) : onChange({ template: id }))}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
