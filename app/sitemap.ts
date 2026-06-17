import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${appUrl}/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${appUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${appUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${appUrl}/blog`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/how-to-create-a-developer-portfolio`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/how-to-get-a-remote-tech-job-from-nigeria`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/portfolio-tips-for-african-tech-professionals`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/what-recruiters-look-for-in-a-portfolio`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/portfolio-for-bootcamp-graduates`,
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('slug, published_at')
      .neq('plan', 'unpublished')
      .not('slug', 'is', null)

    const portfolioPages: MetadataRoute.Sitemap = (users || []).map((u) => ({
      url: `${appUrl}/${u.slug}`,
      lastModified: u.published_at ? new Date(u.published_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...portfolioPages]
  } catch {
    return staticPages
  }
}
