import { GitHubIcon } from '@/assets/icons/gitHub'
import type { Doc } from '@/lib/content'
import { GITHUB_BLOB } from '@/lib/repo'
import { Pager } from '@/modules/docs/components/pager'
import { TocRail } from '@/modules/docs/components/tocRail'

/** One doc chapter: eyebrow + title + lede header, prose body, pager, TOC. */
export function ChapterTemplate({ doc }: { doc: Doc }) {
  const { chapter, prev, next, html, toc } = doc

  return (
    <div className="flex gap-10">
      <div data-doc-content className="min-w-0 flex-1 py-10">
        <div className="mx-auto max-w-content">
          <header>
            <p className="eyebrow">{chapter.section}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">
              {chapter.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{chapter.summary}</p>
          </header>

          <article
            className="prose mt-8"
            // Trusted HTML produced by our own markdown pipeline (lib/markdown).
            dangerouslySetInnerHTML={{ __html: html }}
          />

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

          <Pager prev={prev} next={next} />
        </div>
      </div>

      <TocRail toc={toc} />
    </div>
  )
}
