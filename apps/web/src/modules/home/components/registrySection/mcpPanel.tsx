import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { SparklesIcon } from "@/assets/icons/sparkles";
import { docsUrl } from "@/lib/constants";

/** An agent installing a module over MCP, shown as a short exchange. */
export function McpPanel() {
  return (
    <div className="forge relative overflow-hidden rounded-xl border border-line bg-canvas shadow-xl shadow-black/10">
      <div className="heat-line absolute inset-x-10 top-0" aria-hidden="true" />
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-xs text-faint">
          your agent, over MCP
        </span>
        <SparklesIcon width={14} height={14} className="text-brand" />
      </div>
      <div className="space-y-4 p-5 text-sm">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-lg border border-line bg-surface px-4 py-2.5 text-ink">
            Add auth to my app.
          </p>
        </div>
        <div className="space-y-2 font-mono text-code">
          <p className="text-code-dim">
            ⚙ add_module {"{"} source:{" "}
            <span className="text-code-str">&quot;damatjs/user&quot;</span>{" "}
            {"}"}
          </p>
          <p className="text-code-ok">
            ✓ registered &quot;user&quot; in damat.config.ts
          </p>
          <p className="text-code-ok">✓ env keys synced → .env</p>
        </div>
        <p className="max-w-[85%] rounded-lg border border-line bg-surface px-4 py-2.5 text-muted">
          Done — run{" "}
          <code className="font-mono text-ink">bun damat-orm migrate:up</code>{" "}
          to apply the 4 new tables.
        </p>
      </div>
      <div className="border-t border-line px-5 py-3.5">
        <Link
          href={docsUrl("installing-modules-with-ai")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
        >
          Set up the module MCP
          <ArrowRightIcon width={13} height={13} />
        </Link>
      </div>
    </div>
  );
}
