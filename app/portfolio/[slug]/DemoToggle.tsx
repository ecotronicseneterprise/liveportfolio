'use client'

import React, { useState } from 'react'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import Creative from '@/components/templates/Creative'
import Developer from '@/components/templates/Developer'
import Designer from '@/components/templates/Designer'
import DataScientist from '@/components/templates/DataScientist'
import ProductManager from '@/components/templates/ProductManager'
import Finance from '@/components/templates/Finance'
import Graduate from '@/components/templates/Graduate'
import Cybersecurity from '@/components/templates/Cybersecurity'
import type { PortfolioContent } from '@/components/templates/Minimal'

type TemplateKey = 'minimal' | 'bold' | 'creative' | 'developer' | 'designer' | 'data-scientist' | 'product-manager' | 'finance' | 'graduate' | 'cybersecurity'

interface Props {
  content: PortfolioContent
  defaultTemplate: TemplateKey
}

// Free/Basic: first 3. Pro: all 10.
const FREE_TEMPLATES: TemplateKey[] = ['minimal', 'bold', 'creative']
const ALL_TEMPLATES: TemplateKey[] = ['minimal', 'bold', 'creative', 'developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity']

const LABELS: Record<TemplateKey, string> = {
  minimal: 'Min',
  bold: 'Bold',
  creative: 'Cre',
  developer: 'Dev',
  designer: 'Dsgn',
  'data-scientist': 'Data',
  'product-manager': 'PM',
  finance: 'Fin',
  graduate: 'Grad',
  cybersecurity: 'Sec',
}

const TEMPLATE_COMPONENTS: Record<TemplateKey, React.ComponentType<{ content: PortfolioContent }>> = {
  minimal: Minimal,
  bold: Bold,
  creative: Creative,
  developer: Developer,
  designer: Designer,
  'data-scientist': DataScientist,
  'product-manager': ProductManager,
  finance: Finance,
  graduate: Graduate,
  cybersecurity: Cybersecurity,
}

export default function DemoToggle({ content, defaultTemplate }: Props) {
  const [template, setTemplate] = useState<TemplateKey>(defaultTemplate)
  const [showPicker, setShowPicker] = useState(false)

  const Template = TEMPLATE_COMPONENTS[template]

  const next = () => {
    const idx = FREE_TEMPLATES.indexOf(template as typeof FREE_TEMPLATES[number])
    if (idx === -1) {
      setTemplate(FREE_TEMPLATES[0])
    } else {
      setTemplate(FREE_TEMPLATES[(idx + 1) % FREE_TEMPLATES.length])
    }
  }

  const isDark = ['bold', 'developer', 'data-scientist', 'finance', 'cybersecurity'].includes(template)

  return (
    <>
      <Template content={content} />

      {/* Toggle button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        title={`Switch template (currently: ${template})`}
        className="fixed top-4 right-4 z-50 h-9 px-3 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105"
        style={{
          background: isDark ? '#F0F6FF' : '#0A0A0A',
          color: isDark ? '#0A0A0A' : '#F0F6FF',
        }}
      >
        <span>{LABELS[template]}</span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>

      {/* Picker popover */}
      {showPicker && (
        <div
          className="fixed top-14 right-4 z-50 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #e5e7eb', minWidth: 140 }}
        >
          <div style={{ padding: '8px 12px 4px', fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Free Templates
          </div>
          {FREE_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => { setTemplate(t); setShowPicker(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', fontSize: 13, fontWeight: template === t ? 700 : 400,
                color: template === t ? '#2563EB' : '#374151',
                background: template === t ? '#EFF6FF' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'background 0.1s',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')}
            </button>
          ))}
          <div style={{ padding: '8px 12px 4px', fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
            Pro Templates
          </div>
          {ALL_TEMPLATES.slice(3).map((t) => (
            <button
              key={t}
              onClick={() => { setTemplate(t); setShowPicker(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', fontSize: 13, fontWeight: template === t ? 700 : 400,
                color: template === t ? '#2563EB' : '#374151',
                background: template === t ? '#EFF6FF' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'background 0.1s',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')}
            </button>
          ))}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
            <a href="/create" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Unlock Pro templates →
            </a>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
      )}
    </>
  )
}
