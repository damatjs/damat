import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllSlugs, getChapter, getDoc } from '@/lib/content'
import { SITE } from '@/lib/site'
import { breadcrumbJsonLd, techArticleJsonLd } from '@/lib/utils/jsonLd'
import { ChapterTemplate } from '@/modules/docs/templates/chapter'

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const chapter = getChapter(slug)
  if (!chapter) return {}
  const url = `${SITE.url}/docs/${slug}`
  return {
    title: chapter.title,
    description: chapter.summary,
    alternates: { canonical: url },
    openGraph: {
      title: chapter.title,
      description: chapter.summary,
      url,
      siteName: `${SITE.name} docs`,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: chapter.title,
      description: chapter.summary,
    },
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDoc(slug)
  if (!doc) notFound()

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Docs', path: '/docs' },
      { name: doc.chapter.section },
      { name: doc.chapter.title, path: `/docs/${slug}` },
    ]),
    techArticleJsonLd({
      title: doc.chapter.title,
      description: doc.chapter.summary,
      path: `/docs/${slug}`,
    }),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        // Static, typed JSON built in lib/utils/jsonLd — no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChapterTemplate doc={doc} />
    </>
  )
}
