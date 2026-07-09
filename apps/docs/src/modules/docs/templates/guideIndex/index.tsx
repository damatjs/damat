import Link from 'next/link'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'
import type { Section } from '@/lib/content'
import { ChapterList } from '@/modules/docs/components/chapterList'

/** The docs landing page: intro + the full chapter map. */
export function GuideIndexTemplate({ sections }: { sections: Section[] }) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <header>
        <p className="eyebrow">Documentation</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">The Damat Guide</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          A step-by-step walkthrough — from zero to a running, modular backend,
          then deeper into every building block. New here? Start with{' '}
          <Link href="/docs/introduction" className="font-medium text-brand hover:underline">
            Introduction
          </Link>{' '}
          and{' '}
          <Link href="/docs/concepts" className="font-medium text-brand hover:underline">
            Concepts
          </Link>
          .
        </p>
      </header>

      <div className="mt-12">
        <ChapterList sections={sections} />
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-subtle/60 p-6">
        <div>
          <p className="font-medium text-ink">Ready to build?</p>
          <p className="mt-1 text-sm text-muted">Scaffold an app and follow along.</p>
        </div>
        <Link href="/docs/getting-started" className="btn-primary">
          Get started
          <ArrowRightIcon width={15} height={15} />
        </Link>
      </div>
    </div>
  )
}
