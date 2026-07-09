import { REGISTRY_URL } from "@/lib/constants";
import type { RegistryModule } from "@/lib/data/registry";
import { PageHeader } from "@/modules/layout/components/pageHeader";
import { ModuleCard } from "@/modules/registry/components/moduleCard";
import { PublishPanel } from "@/modules/registry/components/publishPanel";
import { SourcesPanel } from "@/modules/registry/components/sourcesPanel";

/** /modules — the registry catalog rendered from the live index. */
export function RegistryTemplate({ modules }: { modules: RegistryModule[] }) {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <PageHeader
        eyebrow="Module registry"
        title="Backends, one module at a time."
      >
        Every entry below comes from the live registry index — the same file the
        CLI and MCP server resolve against. Verified entries are vouched for by{" "}
        <a
          href={REGISTRY_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ink underline decoration-line underline-offset-4 hover:decoration-brand"
        >
          registry.damatjs.com
        </a>
        ; community entries install just the same.
      </PageHeader>

      <section
        aria-label="Available modules"
        className="border-t border-line px-6 py-16 lg:px-10"
      >
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>

      <SourcesPanel />
      <PublishPanel />
    </div>
  );
}
