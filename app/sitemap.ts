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
      url: `${appUrl}/cv-to-portfolio`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/portfolio-builder`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/free-portfolio-website`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/what-is-a-portfolio`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
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
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/how-to-create-a-developer-portfolio`,
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/how-to-get-a-remote-tech-job-from-nigeria`,
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/portfolio-tips-for-african-tech-professionals`,
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/what-recruiters-look-for-in-a-portfolio`,
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/portfolio-for-bootcamp-graduates`,
      lastModified: new Date('2026-07-04'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/blog/is-canva-a-portfolio-website`,
      lastModified: new Date('2026-07-14'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/is-github-a-portfolio-website`,
      lastModified: new Date('2026-07-14'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/is-behance-a-portfolio-website`,
      lastModified: new Date('2026-07-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/is-notion-a-portfolio`,
      lastModified: new Date('2026-07-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/remote-jobs-for-nigerians`,
      lastModified: new Date('2026-07-16'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/cv-vs-portfolio-nigeria`,
      lastModified: new Date('2026-07-16'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/how-to-build-a-portfolio-with-no-experience-nigeria`,
      lastModified: new Date('2026-07-17'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/best-portfolio-builder-nigeria`,
      lastModified: new Date('2026-07-17'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/linkedin-to-portfolio`,
      lastModified: new Date('2026-07-18'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog/portfolio-for-web-developers`,
      lastModified: new Date('2026-07-18'),
      changeFrequency: 'monthly',
      priority: 0.7,
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
