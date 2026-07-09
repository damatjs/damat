import { SITE, GITHUB_URL } from '@/lib/constants'

/** JSON-LD helpers — typed objects rendered into `application/ld+json`. */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
    sameAs: [GITHUB_URL],
  } as const
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
  } as const
}
