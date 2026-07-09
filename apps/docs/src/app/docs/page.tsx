import type { Metadata } from 'next'
import { getSections } from '@/lib/content'
import { SITE } from '@/lib/site'
import { GuideIndexTemplate } from '@/modules/docs/templates/guideIndex'

export const metadata: Metadata = {
  title: 'The Damat Guide',
  description:
    'A step-by-step walkthrough of Damat — from zero to a running, modular backend.',
  alternates: { canonical: `${SITE.url}/docs` },
  openGraph: {
    title: 'The Damat Guide',
    description:
      'A step-by-step walkthrough of Damat — from zero to a running, modular backend.',
    url: `${SITE.url}/docs`,
    siteName: `${SITE.name} docs`,
    type: 'website',
  },
}

export default function GuideIndexPage() {
  const sections = getSections()
  return <GuideIndexTemplate sections={sections} />
}
