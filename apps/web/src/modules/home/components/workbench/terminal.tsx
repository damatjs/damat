import { cn } from "@/lib/utils";

type TermLine = { kind: "cmd" | "info" | "ok" | "run"; text: string };

const LINES: TermLine[] = [
  { kind: "cmd", text: "damat module add damatjs/user@0.2.0" },
  { kind: "info", text: "resolving from registry.damatjs.com" },
  { kind: "ok", text: "owner damatjs — verified" },
  { kind: "ok", text: "module copied → src/modules/user" },
  { kind: "ok", text: 'registered "user" in damat.config.ts' },
  { kind: "ok", text: "env keys synced → .env" },
  { kind: "cmd", text: "bun damat-orm migrate:up" },
  { kind: "ok", text: "4 tables — users, accounts, sessions, verifications" },
  { kind: "cmd", text: "damat dev" },
  { kind: "run", text: "listening on :6543 — user module mounted" },
];

const MARKS: Record<TermLine["kind"], { glyph: string; className: string }> = {
  cmd: { glyph: "$", className: "text-code-key" },
  info: { glyph: "●", className: "text-code-dim" },
  ok: { glyph: "✓", className: "text-code-ok" },
  run: { glyph: "►", className: "text-code-key" },
};

/** The staged terminal session — line delays come from `.term-seq` CSS. */
export function Terminal() {
  return (
    <div className="term-seq flex h-full flex-col gap-1 p-5 font-mono text-code">
      {LINES.map((line) => (
        <div key={line.text} className="land flex gap-2.5">
          <span className={cn("select-none", MARKS[line.kind].className)}>
            {MARKS[line.kind].glyph}
          </span>
          <span
            className={
              line.kind === "cmd" ? "text-code-plain" : "text-code-dim"
            }
          >
            {line.text}
          </span>
        </div>
      ))}
      <div className="land flex gap-2.5">
        <span className="select-none text-code-key">$</span>
        <span className="caret" aria-hidden="true" />
      </div>
    </div>
  );
}
