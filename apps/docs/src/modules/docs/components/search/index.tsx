"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeftIcon } from "@/assets/icons/cornerDownLeft";
import { HashIcon } from "@/assets/icons/hash";
import { SearchIcon } from "@/assets/icons/search";
import type { SearchDoc } from "@/lib/types";

interface Hit {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

function scoreDoc(doc: SearchDoc, terms: string[]): Hit | null {
  const title = doc.title.toLowerCase();
  const section = doc.section.toLowerCase();
  const headings = doc.headings.join(" • ").toLowerCase();
  const text = doc.text.toLowerCase();
  let score = 0;

  for (const t of terms) {
    if (!t) continue;
    let matched = false;
    if (title.includes(t)) {
      score += title.startsWith(t) ? 12 : 8;
      matched = true;
    }
    if (section.includes(t)) {
      score += 3;
      matched = true;
    }
    if (headings.includes(t)) {
      score += 5;
      matched = true;
    }
    if (text.includes(t)) {
      score += 2;
      matched = true;
    }
    if (!matched) return null; // every term must appear somewhere
  }

  // Build a snippet around the first matching term in the body text.
  let snippet = doc.summary;
  const first = terms.find((t) => text.includes(t));
  if (first) {
    const idx = text.indexOf(first);
    const start = Math.max(0, idx - 32);
    snippet = `${start > 0 ? "…" : ""}${doc.text.slice(start, start + 120).trim()}…`;
  }

  return { doc, score, snippet };
}

export function SearchDialog({
  index,
  open,
  onClose,
}: {
  index: SearchDoc[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return index
        .slice(0, 8)
        .map((doc) => ({ doc, score: 0, snippet: doc.summary }));
    }
    return index
      .map((doc) => scoreDoc(doc, terms))
      .filter((h): h is Hit => h !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [query, index]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: query intentionally resets the highlighted result
  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // focus after the dialog paints
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  function go(hit: Hit | undefined) {
    if (!hit) return;
    onClose();
    router.push(`/docs/${hit.doc.slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  // Portaled to <body>: the header's backdrop-blur would otherwise trap this
  // fixed overlay inside the header bar.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="shrink-0 text-faint" width={18} height={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the docs…"
            className="w-full bg-transparent py-4 text-md text-ink outline-none placeholder:text-faint"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-2xs text-faint sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">
              No results for “{query}”.
            </p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={hit.doc.slug}
                type="button"
                data-idx={i}
                onClick={() => go(hit)}
                onMouseMove={() => setActive(i)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  i === active ? "bg-subtle" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                    i === active
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-line text-faint"
                  }`}
                >
                  <HashIcon width={14} height={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {hit.doc.title}
                    </span>
                    <span className="shrink-0 text-2xs uppercase tracking-wide text-faint">
                      {hit.doc.section}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                    {hit.snippet}
                  </span>
                </span>
                {i === active && (
                  <CornerDownLeftIcon
                    width={14}
                    height={14}
                    className="mt-1.5 shrink-0 text-faint"
                  />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-2xs text-faint">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line px-1">↑</kbd>
              <kbd className="rounded border border-line px-1">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line px-1">↵</kbd>
              to open
            </span>
          </span>
          <span>Damat docs</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
