'use client'

import { useState } from 'react'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import Neutral from '@/components/templates/Neutral'
import type { PortfolioContent } from '@/components/templates/Minimal'

interface Props {
  content: PortfolioContent
  defaultTemplate: 'minimal' | 'bold' | 'neutral'
}

const TEMPLATES = ['minimal', 'bold', 'neutral'] as const
const LABELS: Record<string, string> = { minimal: '☀', bold: '🌙', neutral: '📄' }

export default function DemoToggle({ content, defaultTemplate }: Props) {
  const [template, setTemplate] = useState<'minimal' | 'bold' | 'neutral'>(defaultTemplate)

  const next = () => {
    const idx = TEMPLATES.indexOf(template)
    setTemplate(TEMPLATES[(idx + 1) % TEMPLATES.length])
  }

  return (
    <>
      {template === 'minimal' && <Minimal content={content} />}
      {template === 'bold' && <Bold content={content} />}
      {template === 'neutral' && <Neutral content={content} />}

      <button
        onClick={next}
        title={`Switch template (currently: ${template})`}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 text-base"
        style={{
          background: template === 'bold' ? '#F0F6FF' : template === 'neutral' ? '#0d0d0d' : '#0A0A0A',
          color: template === 'bold' ? '#0A0A0A' : '#F0F6FF',
        }}
      >
        {LABELS[template]}
      </button>
    </>
  )
}
