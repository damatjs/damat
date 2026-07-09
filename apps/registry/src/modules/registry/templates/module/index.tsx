import Link from "next/link";
import { ChevronRightIcon } from "@/assets/icons/chevronRight";
import { installCommand, type Module } from "@/lib/registry";
import { DOCS_URL } from "@/lib/site";
import { Shell } from "@/modules/layout/components/shell";
import { InstallSnippet } from "@/modules/registry/components/installSnippet";
import { InstallSteps } from "@/modules/registry/components/installSteps";
import { McpCard } from "@/modules/registry/components/mcpCard";
import { MetaRail } from "@/modules/registry/components/metaRail";
import { TrustPanel } from "@/modules/registry/components/trustPanel";
import { VerifiedBadge } from "@/modules/registry/components/verifiedBadge";
import { VersionsTable } from "@/modules/registry/components/versionsTable";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One module, in depth: install, what happens, versions, trust, agents. */
export function ModuleTemplate({ module }: { module: Module }) {
  const install = installCommand(module, module.latest);

  return (
    <Shell>
      <nav
        className="flex items-center gap-1.5 text-sm text-faint"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="transition-colors hover:text-ink">
          Registry
        </Link>
        <ChevronRightIcon width={13} height={13} />
        <span className="truncate font-mono text-muted">{module.key}</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-3xl font-semibold tracking-tight text-ink">
            {module.namespace && (
              <span className="text-faint">{module.namespace}/</span>
            )}
            {module.name}
          </h1>
          {module.latest && (
            <span className="font-mono text-sm text-faint">
              v{module.latest}
            </span>
          )}
          <VerifiedBadge module={module} />
        </div>
        {module.description && (
          <p className="mt-3 text-lg leading-relaxed text-muted">
            {module.description}
          </p>
        )}
      </header>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <Section title="Install">
            <InstallSnippet command={install} className="text-base" />
            <p className="mt-2 text-sm text-muted">
              Pin a version with{" "}
              <code className="font-mono text-code">@version</code> (see the
              table below), or read the{" "}
              <a
                href={`${DOCS_URL}/docs/installing-modules`}
                className="font-medium text-brand hover:underline"
              >
                installing modules guide
              </a>
              .
            </p>
          </Section>

          <Section title="What happens when you install">
            <InstallSteps module={module} />
          </Section>

          <Section title="Versions">
            <VersionsTable module={module} />
          </Section>

          <Section title="Trust & verification">
            <TrustPanel module={module} />
          </Section>

          <Section title="Agents">
            <McpCard module={module} />
          </Section>
        </div>

        <MetaRail module={module} />
      </div>
    </Shell>
  );
}
