import type { VerdictExample } from "@/modules/marketing/data/types";

const STATUS_BADGE: Record<VerdictExample["status"], string> = {
  pass: "badge-ok",
  warn: "border-brand bg-[var(--accent-soft)] text-brand",
  blocked: "badge-danger",
};

const STATUS_LABEL: Record<VerdictExample["status"], string> = {
  pass: "PASS",
  warn: "WARN",
  blocked: "BLOCKED",
};

/** Illustrative per-version verdict card: package, score, status, signal chips. */
export function VerdictCard({ example }: { example: VerdictExample }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-mono text-code text-ink">
          {example.pkg}
          <span className="text-faint">@{example.version}</span>
        </p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-2xs ${STATUS_BADGE[example.status]}`}
        >
          {STATUS_LABEL[example.status]} · {example.score}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{example.headline}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {example.chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-line bg-subtle px-2 py-0.5 text-2xs text-faint"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
