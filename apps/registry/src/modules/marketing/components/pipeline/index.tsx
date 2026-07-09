import type { CSSProperties } from "react";
import type { PipelineStage } from "@/modules/marketing/data/types";

/** The trust pipeline: numbered node cards with pulsing borders, captions below. */
export function Pipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {stages.map((stage, i) => (
        <li key={stage.label} className="flex flex-col">
          <div
            className={`pipe-node rounded-lg border p-3 ${
              stage.accent
                ? "border-brand bg-[var(--accent-soft)]"
                : "border-line bg-surface"
            }`}
            style={{ "--i": i } as CSSProperties}
          >
            <span className="font-mono text-2xs text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p
              className={`mt-1 text-sm font-semibold ${
                stage.accent ? "text-brand" : "text-ink"
              }`}
            >
              {stage.label}
            </p>
          </div>
          <p className="mt-2 text-2xs leading-relaxed text-faint">
            {stage.caption}
          </p>
        </li>
      ))}
    </ol>
  );
}
