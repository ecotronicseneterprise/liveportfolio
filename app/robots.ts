import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api/', '/preview/'],
    },
    sitemap: 'https://liveportfolio.site/sitemap.xml',
  }
}
