'use client'

import dynamic from 'next/dynamic'
import { createElement, useId, type ComponentType } from 'react'
import type { PortfolioContent } from './Minimal'
import type { TemplateId } from '@/lib/plans'
import type { LookTemplate } from '@/lib/blocks/presets'
import { portfolioRenderMode } from '@/lib/portfolio/render-mode'
import { safeContent } from '@/lib/portfolio/render-safe'
import type { ProTemplateId } from '@/lib/portfolio/presentation'

// Every template as its own lazily-loaded chunk (client only). Used by the onboarding gallery and the preview page, so a
// person previewing "Minimal" does not download the other nine.
type T = ComponentType<{ content: PortfolioContent }>
const load = (loader: () => Promise<{ default: T }>) => dynamic(loader, { ssr: false, loading: () => null })

// The three FREE templates draw with the block renderer when the content carries a valid layout (every new portfolio does), and with today's
// component otherwise (every portfolio saved before the block renderer). The block renderer is its own lazy chunk, loaded only when needed.
const LookLazy = dynamic(() => import('@/components/blocks/Look'), { ssr: false, loading: () => null })
const ProLazy = dynamic(() => import('./pro/ProDesign'), { ssr: false, loading: () => null })
const safeTemplate = (Component: T): T => function SafeTemplate({ content }) {
  const safe = safeContent(content as unknown as Record<string, unknown>) as unknown as PortfolioContent
  return createElement(Component, { content: safe })
}
const withPro = (id: ProTemplateId, Legacy: T): T => function VersionedTemplate({ content }) {
  const idPrefix = `pro-${useId().replace(/:/g, '')}`
  const mode = portfolioRenderMode(content, id)
  return mode.kind === 'pro' ? createElement(ProLazy, { template: id, content, idPrefix }) : createElement(Legacy, { content })
}
const withLook = (id: LookTemplate, Legacy: T): T =>
  function Templated({ content }) {
    const mode = portfolioRenderMode(content, id)
    const layout = mode.kind === 'blocks' ? mode.layout : null
    return layout ? createElement(LookLazy, { template: id, content, layout }) : createElement(Legacy, { content })
  }

export const TEMPLATES: Record<TemplateId, T> = {
  minimal: safeTemplate(withLook('minimal', load(() => import('./Minimal')))),
  bold: safeTemplate(withLook('bold', load(() => import('./Bold')))),
  creative: safeTemplate(withLook('creative', load(() => import('./Creative')))),
  developer: safeTemplate(withPro('developer', load(() => import('./Developer')))),
  designer: safeTemplate(withPro('designer', load(() => import('./Designer')))),
  'data-scientist': safeTemplate(withPro('data-scientist', load(() => import('./DataScientist')))),
  'product-manager': safeTemplate(withPro('product-manager', load(() => import('./ProductManager')))),
  finance: safeTemplate(withPro('finance', load(() => import('./Finance')))),
  graduate: safeTemplate(withPro('graduate', load(() => import('./Graduate')))),
  cybersecurity: safeTemplate(withPro('cybersecurity', load(() => import('./Cybersecurity')))),
}

export const TEMPLATE_LABEL: Record<TemplateId, string> = {
  minimal: 'Minimal', bold: 'Bold', creative: 'Creative', developer: 'Developer', designer: 'Designer',
  'data-scientist': 'Data scientist', 'product-manager': 'Product manager', finance: 'Finance', graduate: 'Graduate', cybersecurity: 'Cybersecurity',
}
