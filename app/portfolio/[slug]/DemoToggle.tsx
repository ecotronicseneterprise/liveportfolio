'use client'

import { useState } from 'react'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import type { PortfolioContent } from '@/components/templates/Minimal'

interface Props {
  content: PortfolioContent
  defaultTemplate: 'minimal' | 'bold'
}

export default function DemoToggle({ content, defaultTemplate }: Props) {
  const [template, setTemplate] = useState<'minimal' | 'bold'>(defaultTemplate)
  const isDark = template === 'bold'

  return (
    <>
      {template === 'minimal' ? (
        <Minimal content={content} />
      ) : (
        <Bold content={content} />
      )}

      <button
        onClick={() => setTemplate(isDark ? 'minimal' : 'bold')}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: isDark ? '#F0F6FF' : '#0A0A0A',
          color: isDark ? '#0A0A0A' : '#F0F6FF',
        }}
      >
        {isDark ? '☀' : '🌙'}
      </button>
    </>
  )
}
