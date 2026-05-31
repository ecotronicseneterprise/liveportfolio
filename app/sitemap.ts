import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://liveportfolio.site',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://liveportfolio.site/create',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://liveportfolio.site/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://liveportfolio.site/blog',
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://liveportfolio.site/blog/how-to-create-a-developer-portfolio',
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://liveportfolio.site/blog/how-to-get-a-remote-tech-job-from-nigeria',
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://liveportfolio.site/blog/portfolio-tips-for-african-tech-professionals',
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://liveportfolio.site/blog/what-recruiters-look-for-in-a-portfolio',
      lastModified: new Date('2026-05-31'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://liveportfolio.site/blog/portfolio-for-bootcamp-graduates',
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
      .eq('plan', 'pro')
      .not('slug', 'is', null)

    const portfolioPages: MetadataRoute.Sitemap = (users || []).map((u) => ({
      url: `https://${u.slug}.liveportfolio.site`,
      lastModified: u.published_at ? new Date(u.published_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...portfolioPages]
  } catch {
    return staticPages
  }
}
