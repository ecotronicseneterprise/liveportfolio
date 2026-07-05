import React from 'react'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

export const revalidate = 43200 // 12 hours — revalidatePath in /api/update busts this on every save
import { createHash } from 'crypto'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getIpInfo } from '@/lib/ipinfo'
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

const DEMO_SLUGS = new Set([
  'james-chen', 'sofia-martinez', 'fatima-hassan',
  'david-mensah', 'priya-sharma', 'chidi-okafor',
  'michael-roberts', 'elena-vasquez',
])

// Demo portfolios removed — amara, benedicta, ezekwe, emeka now resolve via Supabase
const DEMO_PORTFOLIOS: Record<string, { template: 'minimal' | 'bold' | 'creative'; content: PortfolioContent }> = {}

// Module-level cache: ip_hash → timestamp. Prevents duplicate inserts within 1 hour.
const serverViewCache = new Map<string, number>()
const SERVER_CACHE_TTL = 60 * 60 * 1000 // 1 hour

const BOT_PATTERN = /bot|crawler|spider|crawling|facebookexternalhit|Twitterbot|LinkedInBot|Googlebot|bingbot|Slurp|DuckDuckBot|YandexBot|Baiduspider|Sogou|Exabot|facebot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot|rogerbot|proximic|archiver|curl|wget|python|java|ruby|php|perl|libwww|HeadlessChrome|Playwright|PhantomJS|Puppeteer|selenium|headless|chrome-lighthouse|pagespeed/i

function getDeviceType(ua: string): 'mobile' | 'desktop' | 'tablet' {
  const u = ua.toLowerCase()
  if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/.test(u)) return 'tablet'
  if (/mobile|iphone|ipod|phone|android|blackberry|iemobile|opera mini/.test(u)) return 'mobile'
  return 'desktop'
}

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

  // Fire-and-forget: record portfolio_view event with company/country enrichment.
  // Does not block render. Uses server-side headers — raw IP never stored.
  // Skip demo/showcase slugs to prevent slideshow traffic inflating analytics.
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const isDashboardPreview = resolvedSearchParams['dashboard'] === 'true'

  if (!DEMO_SLUGS.has(slug) && !isDashboardPreview) {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const rawIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown'
    const referrer = headersList.get('referer') || null

    // Skip requests with no traceable IP — likely ISR background renders or internal health checks
    if (rawIp !== 'unknown') {
      const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16)

      // Skip bots, crawlers, and headless browsers (empty UA also excluded)
      if (userAgent && !BOT_PATTERN.test(userAgent)) {
        // 1-hour server-side dedup — same IP+slug pair only counts once per hour
        const cacheKey = `${ipHash}:${portfolio.id}`
        const lastSeen = serverViewCache.get(cacheKey)
        const now = Date.now()

        if (!lastSeen || now - lastSeen > SERVER_CACHE_TTL) {
          serverViewCache.set(cacheKey, now)

          // Evict oldest entries when cache grows large
          if (serverViewCache.size > 1000) {
            const oldest = [...serverViewCache.entries()]
              .sort((a, b) => a[1] - b[1])
              .slice(0, 200)
            oldest.forEach(([key]) => serverViewCache.delete(key))
          }

          const deviceType = getDeviceType(userAgent)
          getIpInfo(rawIp, ipHash, supabaseAdmin).then(({ company, country }) => {
            void Promise.resolve(
              supabaseAdmin.from('analytics_events').insert({
                portfolio_id: portfolio.id,
                event_type: 'portfolio_view',
                referrer,
                ip_hash: ipHash,
                company,
                country,
                device_type: deviceType,
              })
            )
            void Promise.resolve(
              supabaseAdmin.rpc('increment_view_count', { portfolio_id: portfolio.id })
            )
          }).catch(() => {})
        }
      }
    }
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
  const PRO_TEMPLATES = new Set(['developer', 'designer', 'data-scientist', 'product-manager', 'finance', 'graduate', 'cybersecurity'])
  // Gate Pro templates: only render if user has pro plan. Basic/free fall back to Minimal.
  // The stored template value is preserved — upgrading to Pro activates it automatically.
  const isPro = (data as { plan?: string }).plan === 'pro'
  const effectiveTemplate = (PRO_TEMPLATES.has(portfolio.template) && !isPro) ? 'minimal' : portfolio.template
  const Template = TEMPLATE_MAP[effectiveTemplate] ?? Minimal
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const c = portfolio.content

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <Template content={portfolio.content} />
      {(data as { plan?: string }).plan !== 'basic' && (data as { plan?: string }).plan !== 'pro' && (
        <AcquisitionBar />
      )}
    </>
  )
}
