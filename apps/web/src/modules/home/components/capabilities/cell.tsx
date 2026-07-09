import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@/assets/icons/arrowRight'

/** One capability cell in the shared-hairline grid. */
export function Cell({
  href,
  title,
  body,
  visual,
}: {
  href: string
  title: string
  body: string
  visual: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-canvas p-6 transition-colors hover:bg-subtle sm:p-7"
    >
      <div className="min-w-0">{visual}</div>
      <h3 className="mt-5 text-md font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
        Learn more
        <ArrowRightIcon width={13} height={13} />
      </span>
    </Link>
  )
}
