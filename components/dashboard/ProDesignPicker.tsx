'use client'

import { useState } from 'react'
import { TemplateThumb } from '@/components/onboarding/TemplateGallery'
import { TEMPLATE_LABEL } from '@/components/templates/dynamic'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { usesProDesign, withProDesign, type ProTemplateId } from '@/lib/portfolio/presentation'
import { t } from '@/lib/onboarding/t'

/** Preview state stays HERE, never in editable content or incidental image/template saves. */
export default function ProDesignPicker({ content, template, selectedTemplate, isPro, busy, onSave, onUpgrade }: {
  content: PortfolioContent; template: ProTemplateId; selectedTemplate: string; isPro: boolean; busy: boolean
  onSave: (template: ProTemplateId, enabled: boolean) => Promise<void>
  onUpgrade: () => void
}) {
  const current = usesProDesign(content, template)
  const [previewNew, setPreviewNew] = useState(current)
  const preview = withProDesign(content, template, previewNew)
  const unchanged = current === previewNew && template === selectedTemplate
  const allowed = isPro || (!previewNew && template === selectedTemplate)
  return <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4" aria-label={t('proDesign.title')}>
    <div><h3 className="text-base font-semibold text-gray-900">{TEMPLATE_LABEL[template]} — {t('proDesign.title')}</h3><p className="mt-1 text-sm text-gray-600">{t('proDesign.note')}</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('proDesign.preview')}>
      {[false, true].map((enabled) => <button key={String(enabled)} type="button" aria-pressed={previewNew === enabled}
        className={`min-h-[44px] rounded-full border px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${previewNew === enabled ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-300 bg-white text-gray-800'}`}
        onClick={() => setPreviewNew(enabled)}>{t(enabled ? 'proDesign.new' : 'proDesign.previous')}</button>)}
    </div>
    <p role="status" className="text-sm text-gray-700">{t(previewNew ? 'proDesign.previewNew' : 'proDesign.previewPrevious')}</p>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><TemplateThumb id={template} content={preview} height={560} scrollable /></div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy || (allowed && unchanged)} onClick={() => allowed ? void onSave(template, previewNew) : onUpgrade()}
        className="min-h-[44px] rounded-full bg-[#0A66C2] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        {busy ? t('proDesign.saving') : !allowed ? t('proDesign.upgrade') : unchanged ? t('proDesign.selected') : t('proDesign.save')}
      </button><p className="text-xs text-gray-600">{t('proDesign.saveNote')}</p>
    </div>
  </section>
}