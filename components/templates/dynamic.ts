'use client'

import dynamic from 'next/dynamic'
import { createElement, type ComponentType } from 'react'
import type { PortfolioContent } from './Minimal'
import type { TemplateId } from '@/lib/plans'
import { storedLayout } from '@/lib/blocks/mode'
import type { LookTemplate } from '@/lib/blocks/presets'

// Every template as its own lazily-loaded chunk (client only). Used by the onboarding gallery and the preview page, so a
// person previewing "Minimal" does not download the other nine.
type T = ComponentType<{ content: PortfolioContent }>
const load = (loader: () => Promise<{ default: T }>) => dynamic(loader, { ssr: false, loading: () => null })

// The three FREE templates draw with the block renderer when the content carries a valid layout (every new portfolio does), and with today's
// component otherwise (every portfolio saved before the block renderer). The block renderer is its own lazy chunk, loaded only when needed.
const LookLazy = dynamic(() => import('@/components/blocks/Look'), { ssr: false, loading: () => null })
const withLook = (id: LookTemplate, Legacy: T): T =>
  function Templated({ content }) {
    const layout = storedLayout(content, id)
    return layout ? createElement(LookLazy, { template: id, content, layout }) : createElement(Legacy, { content })
  }

export const TEMPLATES: Record<TemplateId, T> = {
  minimal: withLook('minimal', load(() => import('./Minimal'))),
  bold: withLook('bold', load(() => import('./Bold'))),
  creative: withLook('creative', load(() => import('./Creative'))),
  developer: load(() => import('./Developer')),
  designer: load(() => import('./Designer')),
  'data-scientist': load(() => import('./DataScientist')),
  'product-manager': load(() => import('./ProductManager')),
  finance: load(() => import('./Finance')),
  graduate: load(() => import('./Graduate')),
  cybersecurity: load(() => import('./Cybersecurity')),
}

export const TEMPLATE_LABEL: Record<TemplateId, string> = {
  minimal: 'Minimal', bold: 'Bold', creative: 'Creative', developer: 'Developer', designer: 'Designer',
  'data-scientist': 'Data scientist', 'product-manager': 'Product manager', finance: 'Finance', graduate: 'Graduate', cybersecurity: 'Cybersecurity',
}
