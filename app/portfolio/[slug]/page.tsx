import React from 'react'
import { safeJsonLd } from '@/lib/json-ld'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

export const revalidate = 43200 // 12 hours — revalidatePath in /api/update busts this on every save
import { after } from 'next/server'
import { createVisitReceipt, recordVisit, safeReferrer, trackablePortfolio, visitorFromHeaders } from '@/lib/analytics/visits'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
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
import AcquisitionBar from './AcquisitionBar'
import ViewTracker from './ViewTracker'
import { canUseTemplate } from '@/lib/plans'
import { planFromUserColumn } from '@/lib/getUserPlan'
import { safeContent } from '@/lib/portfolio/render-safe'
import Look from '@/components/blocks/Look'
import ProDesign from '@/components/templates/pro/ProDesign'
import { portfolioRenderMode } from '@/lib/portfolio/render-mode'

interface Props {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabaseAdmin
    .from('users')
    .select('portfolios(seo_title, seo_description, og_image_url)')
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  const rawPortfolio = data?.portfolios
  const portfolio = (Array.isArray(rawPortfolio)
    ? (rawPortfolio as unknown as { seo_title: string; seo_description: string; og_image_url: string }[])[0]
    : rawPortfolio as unknown as { seo_title: string; seo_description: string; og_image_url: string } | null) ?? null

  if (!portfolio) return {}

  const canonicalUrl = `${appUrl}/${slug}`
  return {
    title: portfolio.seo_title,
    description: portfolio.seo_description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url
        ? [portfolio.og_image_url]
        : [`${appUrl}/logo-1024.png`],
      url: canonicalUrl,
      type: 'profile',
      siteName: 'liveportfolio.site',
    },
    twitter: {
      card: 'summary_large_image',
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url
        ? [portfolio.og_image_url]
        : [`${appUrl}/logo-1024.png`],
    },
  }
}

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.toLowerCase()

  const supabaseAdmin = getSupabaseAdmin()

  // supabaseAdmin bypasses RLS — required for public portfolio rendering
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      slug,
      plan,
      portfolios(id, template, content)
    `)
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  if (error || !data) {
    notFound()
  }

  // Supabase returns related rows as an array — unwrap the first element
  const portfolioRow = Array.isArray(data.portfolios)
    ? (data.portfolios as unknown as { id: string; template: string; content: PortfolioContent }[])[0]
    : (data.portfolios as unknown as { id: string; template: string; content: PortfolioContent } | null)

  if (!portfolioRow?.content) {
    notFound()
  }

  const portfolio = portfolioRow

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const eligible = trackablePortfolio(slug, resolvedSearchParams['dashboard'] === 'true')
  const requestHeaders = await headers()
  const visitor = eligible ? visitorFromHeaders(requestHeaders) : null
  const receipt = visitor ? createVisitReceipt(portfolio.id, visitor.ipHash) : null
  if (visitor && receipt) {
    const referrer = safeReferrer(requestHeaders.get('referer'))
    after(async () => {
      try { await recordVisit(supabaseAdmin, portfolio.id, receipt, visitor, referrer, false) }
      catch { console.warn('[analytics] server visit failed') }
    })
  }

  const TEMPLATE_MAP: Record<string, React.ComponentType<{ content: PortfolioContent }>> = {
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
  // Gate Pro templates: only render if the plan includes them (lib/plans.ts). Basic falls back to Minimal.
  // The stored template value is preserved — upgrading to Pro activates it automatically.
  const effectiveTemplate = canUseTemplate(planFromUserColumn((data as { plan?: string }).plan), portfolio.template) ? portfolio.template : 'minimal'
  const Template = TEMPLATE_MAP[effectiveTemplate] ?? Minimal
  // New block designs: only a portfolio that stores a valid layout AND uses one of the 3 free template ids. Everything else is legacy, untouched.
  // links that are not plain http(s) addresses are dropped before drawing (defence in depth; the write paths refuse them already)
  const safe = safeContent(portfolio.content as unknown as Record<string, unknown>) as unknown as typeof portfolio.content
  const mode = portfolioRenderMode(safe, effectiveTemplate)
  const layout = mode.kind === 'blocks' ? mode.layout : null
  const paid = (data as { plan?: string }).plan === 'basic' || (data as { plan?: string }).plan === 'pro'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const c = safe

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: c.name,
    jobTitle: c.role,
    description: c.headline,
    email: c.email,
    url: `${appUrl}/${slug}`,
    ...(c.location && { address: { '@type': 'PostalAddress', addressLocality: c.location } }),
    ...(c.github_url && { sameAs: [c.github_url, c.linkedin_url].filter(Boolean) }),
    ...(c.avatar_url && { image: c.avatar_url }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(personSchema) }}
      />
      {receipt && <ViewTracker portfolioId={portfolio.id} receipt={receipt} />}
      {mode.kind === 'pro' ? <ProDesign content={safe} template={mode.template} /> : layout
        ? <Look template={effectiveTemplate} content={safe} layout={layout} page credit={!paid} />
        : <Template content={safe} />}
      {(data as { plan?: string }).plan !== 'basic' && (data as { plan?: string }).plan !== 'pro' && (
        <AcquisitionBar />
      )}
    </>
  )
}
