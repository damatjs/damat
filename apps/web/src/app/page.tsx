import type { Metadata } from 'next'
import { SITE } from '@/lib/constants'
import { organizationJsonLd, webSiteJsonLd } from '@/lib/utils/jsonLd'
import { HomeTemplate } from '@/modules/home/templates'

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: SITE.url },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
}

export default function HomePage() {
  const jsonLd = [organizationJsonLd(), webSiteJsonLd()]

  return (
    <>
      <script
        type="application/ld+json"
        // Static, typed JSON built in lib/utils/jsonLd — no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeTemplate />
    </>
  )
}
