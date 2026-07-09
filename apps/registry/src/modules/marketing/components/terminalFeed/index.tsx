import type { CSSProperties } from "react";
import type { TerminalLine } from "@/modules/marketing/data/types";

const LINE_CLASS: Record<TerminalLine["kind"], string> = {
  cmd: "term-cmd",
  ok: "term-ok",
  danger: "term-danger",
  muted: "term-muted",
};

/** Always-dark terminal panel with staggered line reveal (CSS-only). */
export function TerminalFeed({
  lines,
  className = "",
  animated = true,
}: {
  lines: TerminalLine[];
  className?: string;
  animated?: boolean;
}) {
  return (
    <div className={`term p-4 text-code shadow-2xl ${className}`}>
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
      </div>
      <div role="log" aria-label="Example install session">
        {lines.map((line, i) => (
          <div
            key={`${i}-${line.text}`}
            className={`${animated ? "term-line" : ""} ${LINE_CLASS[line.kind]}`}
            style={{ "--i": i } as CSSProperties}
          >
            {line.kind === "cmd" ? (
              <>
                <span className="term-muted">$ </span>
                {line.text}
              </>
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
