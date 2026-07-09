import { SparklesIcon } from "@/assets/icons/sparkles";
import type { Module } from "@/lib/registry";
import { DOCS_URL, SITE } from "@/lib/site";
import { CopyButton } from "@/modules/common/components/copyButton";

/** Install-with-an-agent card: MCP config + a ready prompt. */
export function McpCard({ module }: { module: Module }) {
  const config = `{
  "mcpServers": {
    "damat-modules": {
      "command": "bunx",
      "args": ["damat-mcp"],
      "env": { "DAMAT_MODULE_REGISTRY": "${SITE.url}/index.json" }
    }
  }
}`;
  const prompt = `Install the ${module.installRef} module into my app and tell me what to run next.`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <SparklesIcon width={15} height={15} className="text-brand" />
        Install it from an AI agent
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Point the Damat MCP server at this registry and your assistant can
        discover, inspect, and install this module for you.
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-line bg-subtle">
        <div className="flex items-center justify-between border-b border-line py-0.5 pl-3 pr-1">
          <span className="font-mono text-2xs uppercase tracking-widest text-faint">
            .mcp.json
          </span>
          <CopyButton text={config} />
        </div>
        <pre className="overflow-x-auto px-3 py-2.5 font-mono text-code text-muted">
          {config}
        </pre>
      </div>
      <p className="mt-3 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm italic text-muted">
        “{prompt}”
      </p>
      <a
        href={`${DOCS_URL}/docs/installing-modules-with-ai`}
        className="mt-3 inline-block text-sm font-medium text-ink transition-colors hover:text-brand"
      >
        Set up the module MCP →
      </a>
    </div>
  );
}
