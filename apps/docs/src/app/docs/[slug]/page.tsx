import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllSlugs, getChapter, getDoc } from '@/lib/content'
import { GITHUB_BLOB } from '@/lib/repo'
import { TocRail } from '@/components/TocRail'
import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, GitHubIcon } from '@/components/icons'

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
  return {
    title: chapter.title,
    description: chapter.summary,
    openGraph: { title: chapter.title, description: chapter.summary },
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await getDoc(slug)
  if (!doc) notFound()

  const { chapter, prev, next, html, toc } = doc

  return (
    <div className="flex gap-10 py-10">
      <div data-doc-content className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-faint" aria-label="Breadcrumb">
            <Link href="/docs" className="transition-colors hover:text-ink">
              Guide
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-muted">{chapter.section}</span>
            <ChevronRightIcon width={13} height={13} />
            <span className="truncate text-ink">{chapter.title}</span>
          </nav>

          <article
            className="prose mt-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Edit link */}
          <div className="mt-10 flex items-center justify-between border-t border-line pt-6 text-sm">
            <a
              href={`${GITHUB_BLOB}/${chapter.path}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-muted transition-colors hover:text-ink"
            >
              <GitHubIcon width={15} height={15} />
              Edit this page on GitHub
            </a>
          </div>

          {/* Prev / next */}
          <nav className="mt-8 grid gap-4 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:items-start"
              >
                <span className="flex items-center gap-1.5 text-xs text-faint">
                  <ArrowLeftIcon width={13} height={13} />
                  Previous
                </span>
                <span className="mt-1 font-medium text-ink transition-colors group-hover:text-brand">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-right transition-colors hover:border-line-strong sm:items-end"
              >
                <span className="flex items-center gap-1.5 text-xs text-faint">
                  Next
                  <ArrowRightIcon width={13} height={13} />
                </span>
                <span className="mt-1 font-medium text-ink transition-colors group-hover:text-brand">
                  {next.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </div>

      <TocRail toc={toc} />
    </div>
  )
}
