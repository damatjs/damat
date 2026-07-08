import Link from 'next/link'
import type { Module } from '@/lib/registry'
import { VerifiedBadge } from './VerifiedBadge'
import { BoxIcon } from './icons'

export function ModuleCard({ module }: { module: Module }) {
  return (
    <Link
      href={`/modules/${module.key}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
            <BoxIcon width={19} height={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[0.95rem] font-medium text-ink">
              {module.namespace && <span className="text-faint">{module.namespace}/</span>}
              {module.name}
            </p>
            {module.latest && (
              <p className="text-xs text-faint">v{module.latest}</p>
            )}
          </div>
        </div>
        <VerifiedBadge module={module} className="shrink-0" />
      </div>

      {module.description && (
        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
          {module.description}
        </p>
      )}

      {module.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {module.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="rounded-md border border-line bg-subtle px-2 py-0.5 text-[0.7rem] text-muted"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
