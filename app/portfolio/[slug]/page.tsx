import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'
import Minimal from '@/components/templates/Minimal'
import Bold from '@/components/templates/Bold'
import type { PortfolioContent } from '@/components/templates/Minimal'
import ClientAnalytics from './ClientAnalytics'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabaseAdmin = getSupabaseAdmin()

  const { data } = await supabaseAdmin
    .from('users')
    .select('portfolios(seo_title, seo_description, og_image_url)')
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  const portfolio = data?.portfolios as unknown as {
    seo_title: string
    seo_description: string
    og_image_url: string
  } | null

  if (!portfolio) return {}

  return {
    title: portfolio.seo_title,
    description: portfolio.seo_description,
    openGraph: {
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url ? [portfolio.og_image_url] : [],
      url: `https://${slug}.liveportfolio.site`,
    },
    twitter: {
      card: 'summary_large_image',
      title: portfolio.seo_title,
      description: portfolio.seo_description,
      images: portfolio.og_image_url ? [portfolio.og_image_url] : [],
    },
  }
}

export default async function PortfolioPage({ params }: Props) {
  const { slug } = await params
  const supabaseAdmin = getSupabaseAdmin()

  // supabaseAdmin bypasses RLS — required for public portfolio rendering
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      slug,
      portfolios(id, template, content)
    `)
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  if (error || !data) {
    notFound()
  }

  const portfolio = data.portfolios as unknown as {
    id: string
    template: string
    content: PortfolioContent
  } | null

  if (!portfolio?.content) {
    notFound()
  }

  const Template = portfolio.template === 'bold' ? Bold : Minimal

  return (
    <>
      <Template content={portfolio.content} />
      <ClientAnalytics slug={slug} />
    </>
  )
}
