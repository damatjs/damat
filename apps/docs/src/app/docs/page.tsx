import type { Metadata } from 'next'
import Link from 'next/link'
import { getSections } from '@/lib/content'
import { ArrowRightIcon } from '@/components/icons'

export const metadata: Metadata = {
  title: 'The Damat Guide',
  description: 'A step-by-step walkthrough of Damat — from zero to a running, modular backend.',
}

export default function GuideIndexPage() {
  const sections = getSections()
  let counter = 0

  return (
    <div className="mx-auto max-w-3xl py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand">Documentation</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">The Damat Guide</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        A step-by-step walkthrough — from zero to a running, modular backend, then deeper into every
        building block. New here? Start with{' '}
        <Link href="/docs/introduction" className="font-medium text-brand hover:underline">
          Introduction
        </Link>{' '}
        and{' '}
        <Link href="/docs/concepts" className="font-medium text-brand hover:underline">
          Concepts
        </Link>
        .
      </p>

      <div className="mt-12 flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-faint">
              {section.title}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {section.chapters.map((chapter) => {
                counter += 1
                return (
                  <Link
                    key={chapter.slug}
                    href={`/docs/${chapter.slug}`}
                    className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle font-mono text-xs text-faint group-hover:border-brand/40 group-hover:text-brand">
                      {counter}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium text-ink">
                        {chapter.title}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">
                        {chapter.summary}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 flex items-center justify-between rounded-2xl border border-line bg-subtle/50 p-6">
        <div>
          <p className="font-medium text-ink">Ready to build?</p>
          <p className="mt-1 text-sm text-muted">Scaffold an app and follow along.</p>
        </div>
        <Link
          href="/docs/getting-started"
          className="inline-flex h-11 items-center gap-2 rounded-xl accent-gradient px-5 font-medium text-white shadow-md transition-transform hover:scale-[1.02]"
        >
          Get started
          <ArrowRightIcon width={16} height={16} />
        </Link>
      </div>
    </div>
  )
}
