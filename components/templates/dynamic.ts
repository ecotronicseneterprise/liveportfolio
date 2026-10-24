'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { PortfolioContent } from './Minimal'
import type { TemplateId } from '@/lib/plans'

// Every template as its own lazily-loaded chunk (client only). Used by the onboarding gallery and the preview page, so a
// person previewing "Minimal" does not download the other nine.
type T = ComponentType<{ content: PortfolioContent }>
const load = (loader: () => Promise<{ default: T }>) => dynamic(loader, { ssr: false, loading: () => null })

export const TEMPLATES: Record<TemplateId, T> = {
  minimal: load(() => import('./Minimal')),
  bold: load(() => import('./Bold')),
  creative: load(() => import('./Creative')),
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
