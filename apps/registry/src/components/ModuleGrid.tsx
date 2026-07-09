'use client'

import { useMemo, useState } from 'react'
import type { Module } from '@/lib/registry'
import { ModuleCard } from './ModuleCard'
import { SearchIcon } from './icons'

function matches(module: Module, terms: string[]): boolean {
  if (terms.length === 0) return true
  const haystack = [
    module.key,
    module.name,
    module.namespace ?? '',
    module.description ?? '',
    module.keywords.join(' '),
  ]
    .join(' ')
    .toLowerCase()
  return terms.every((t) => haystack.includes(t))
}

export function ModuleGrid({ modules }: { modules: Module[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    return modules.filter((m) => matches(m, terms))
  }, [query, modules])

  return (
    <div>
      <div className="flex max-w-xl items-center gap-3 rounded-lg border border-line bg-surface px-4 focus-within:border-brand/50">
        <SearchIcon className="shrink-0 text-faint" width={18} height={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${modules.length} module${modules.length === 1 ? '' : 's'}…`}
          className="w-full bg-transparent py-2.5 text-md text-ink outline-none placeholder:text-faint"
          aria-label="Search modules"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-faint hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-muted">
          No modules match “{query}”.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((module) => (
            <ModuleCard key={module.key} module={module} />
          ))}
        </div>
      )}
    </div>
  )
}
