import type { MetadataRoute } from 'next'
import { getAllSlugs } from '@/lib/content'
import { SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/docs`, changeFrequency: 'weekly', priority: 1 },
    ...getAllSlugs().map((slug) => ({
      url: `${SITE.url}/docs/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
