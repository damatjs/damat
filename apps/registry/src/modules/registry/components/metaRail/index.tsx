import { ExternalLinkIcon } from "@/assets/icons/externalLink";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { TagIcon } from "@/assets/icons/tag";
import type { Module } from "@/lib/registry";
import { VerifiedBadge } from "@/modules/registry/components/verifiedBadge";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line py-3 last:border-0">
      <dt className="font-mono text-2xs font-medium uppercase tracking-widest text-faint">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Sticky fact rail on the module page (npm-style right column). */
export function MetaRail({ module }: { module: Module }) {
  return (
    <aside className="lg:sticky lg:top-20">
      <dl className="rounded-xl border border-line bg-surface px-4">
        <Row label="Latest">
          <span className="font-mono">{module.latest ?? "—"}</span>
        </Row>
        <Row label="Versions">{module.versions.length || "—"}</Row>
        <Row label="License">{module.license ?? "—"}</Row>
        <Row label="Owner">
          <span className="flex items-center gap-2">
            <span className="font-mono">{module.namespace ?? "—"}</span>
            {module.namespace && <VerifiedBadge module={module} />}
          </span>
        </Row>
        {module.verifiedBy && (
          <Row label="Verified by">
            <span className="font-mono text-code">{module.verifiedBy}</span>
          </Row>
        )}
        <Row label="Source">
          <span
            className="block truncate font-mono text-code text-muted"
            title={module.source}
          >
            {module.source}
          </span>
        </Row>
        {(module.repository || module.homepage) && (
          <Row label="Links">
            <span className="flex flex-col gap-1.5">
              {module.repository && (
                <a
                  href={module.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                  <GitHubIcon width={14} height={14} />
                  Repository
                </a>
              )}
              {module.homepage && (
                <a
                  href={module.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                  <ExternalLinkIcon width={14} height={14} />
                  Homepage
                </a>
              )}
            </span>
          </Row>
        )}
        {module.keywords.length > 0 && (
          <Row label="Keywords">
            <span className="flex flex-wrap gap-1.5 pt-0.5">
              {module.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded border border-line bg-subtle px-1.5 py-0.5 text-2xs text-muted"
                >
                  <TagIcon width={10} height={10} className="text-faint" />
                  {kw}
                </span>
              ))}
            </span>
          </Row>
        )}
      </dl>
    </aside>
  );
}
