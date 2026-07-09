"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "@/assets/icons/search";
import type { Module } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { ModuleRow } from "@/modules/registry/components/moduleRow";

type StatusFilter = "all" | "verified" | "community";

function matches(module: Module, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = [
    module.key,
    module.name,
    module.namespace ?? "",
    module.description ?? "",
    module.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

/** Searchable, filterable module list — search, status chips, keyword facets. */
export function BrowseList({ modules }: { modules: Module[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState<string | null>(null);

  const keywords = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mod of modules) {
      for (const kw of mod.keywords) counts.set(kw, (counts.get(kw) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [modules]);

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return modules.filter((mod) => {
      if (status === "verified" && !mod.verified) return false;
      if (status === "community" && mod.verified) return false;
      if (keyword && !mod.keywords.includes(keyword)) return false;
      return matches(mod, terms);
    });
  }, [modules, query, status, keyword]);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-brand/40 bg-brand/10 font-medium text-brand"
        : "border-line text-muted hover:border-line-strong hover:text-ink",
    );

  return (
    <div>
      <div className="flex max-w-xl items-center gap-3 rounded-lg border border-line bg-surface px-4 focus-within:border-brand/50">
        <SearchIcon className="shrink-0 text-faint" width={18} height={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${modules.length} module${modules.length === 1 ? "" : "s"}…`}
          className="w-full bg-transparent py-2.5 text-md text-ink outline-none placeholder:text-faint"
          aria-label="Search modules"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-faint hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["verified", "Verified"],
            ["community", "Community"],
          ] as Array<[StatusFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={chip(status === value)}
          >
            {label}
          </button>
        ))}
        {keywords.length > 0 && (
          <span className="mx-1 h-4 w-px bg-line-strong" aria-hidden="true" />
        )}
        {keywords.map(([kw, count]) => (
          <button
            key={kw}
            type="button"
            onClick={() => setKeyword(keyword === kw ? null : kw)}
            className={chip(keyword === kw)}
          >
            {kw} <span className="text-faint">{count}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 font-mono text-2xs uppercase tracking-widest text-faint">
        {filtered.length} of {modules.length} module
        {modules.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong px-5 py-10 text-center text-muted">
          No modules match{query ? ` “${query}”` : " the current filters"}.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {filtered.map((module) => (
            <ModuleRow key={module.key} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}
