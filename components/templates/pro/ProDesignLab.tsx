'use client'
import { useState } from 'react'
import type { PortfolioContent } from '../Minimal'
import { TEMPLATES } from '../dynamic'
import ProDesignPicker from '@/components/dashboard/ProDesignPicker'
import { withProDesign, type ProTemplateId } from '@/lib/portfolio/presentation'

/** Synthetic local comparison. Saving only updates component state, never an API or a real portfolio. */
export default function ProDesignLab({ content, template, picker = false }: { content: PortfolioContent; template: ProTemplateId; picker?: boolean }) {
  const [saved, setSaved] = useState(content)
  const [version, setVersion] = useState(0)
  if (picker) return <main className="mx-auto max-w-4xl p-6"><h1 className="mb-4 text-xl">Synthetic design comparison — no account or network writes</h1>
    <ProDesignPicker key={version} content={saved} template={template} selectedTemplate={template} isPro busy={false} onUpgrade={() => {}}
      onSave={async (id, enabled) => { setSaved(withProDesign(saved, id, enabled)); setVersion((n) => n + 1) }} /></main>
  const Template = TEMPLATES[template]
  return <Template content={content} />
}