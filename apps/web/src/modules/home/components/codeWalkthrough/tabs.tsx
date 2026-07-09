"use client";

import { useState } from "react";
import { CopyButton } from "@/modules/common/components/copyButton";

export interface CodeTab {
  id: string;
  label: string;
  filename: string;
  /** Pre-highlighted shiki HTML (rendered dark inside the forge panel). */
  html: string;
  code: string;
}

/** Tabbed code showcase — one forge panel, several files. */
export function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];
  if (!tab) return null;

  return (
    <div className="forge min-w-0 overflow-hidden rounded-xl border border-line bg-canvas shadow-xl shadow-black/10">
      <div
        role="tablist"
        aria-label="Code examples"
        className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 pt-3"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`codetab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`codepanel-${t.id}`}
            onClick={() => setActive(i)}
            className={`relative -mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              i === active
                ? "border-brand text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`codepanel-${tab.id}`}
        aria-labelledby={`codetab-${tab.id}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="font-mono text-xs text-faint">{tab.filename}</span>
          <CopyButton text={tab.code} />
        </div>
        <div
          className="overflow-x-auto p-4 text-code [&_pre]:m-0 [&_pre]:bg-transparent"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output of our own static code constants
          dangerouslySetInnerHTML={{ __html: tab.html }}
        />
      </div>
    </div>
  );
}
