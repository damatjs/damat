'use client'

import { useEffect, useState } from 'react'
import type { TocEntry } from '@/lib/types'

export function TocRail({ toc }: { toc: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (toc.length === 0) return
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-88px 0px -66% 0px', threshold: [0, 1] },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [toc])

  if (toc.length < 2) return null

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 overflow-y-auto py-10 xl:block">
      <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-faint">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5 border-l border-line">
        {toc.map((entry) => {
          const active = entry.id === activeId
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={`-ml-px block border-l-2 py-1 text-[0.8rem] leading-snug transition-colors ${
                  entry.depth === 3 ? 'pl-6' : 'pl-3'
                } ${
                  active
                    ? 'border-brand font-medium text-brand'
                    : 'border-transparent text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {entry.text}
              </a>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
