import { CheckIcon } from "@/assets/icons/check";
import type { RegistryModule } from "@/lib/data/registry";
import { CopyButton } from "@/modules/common/components/copyButton";

/** One registry entry — identity, trust status, and the install command. */
export function ModuleCard({ module }: { module: RegistryModule }) {
  return (
    <article className="flex flex-col bg-canvas p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="font-mono text-md font-medium text-ink">{module.id}</h3>
        <span className="font-mono text-xs text-faint">v{module.latest}</span>
        {module.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            <CheckIcon width={11} height={11} />
            Verified
          </span>
        ) : (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-faint">
            Community
          </span>
        )}
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-muted">
        {module.description}
      </p>

      {module.keywords.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {module.keywords.map((keyword) => (
            <li
              key={keyword}
              className="rounded-full bg-subtle px-2 py-0.5 font-mono text-2xs text-faint"
            >
              {keyword}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-subtle py-0.5 pl-3 pr-1 font-mono text-code">
        <span className="truncate">
          <span className="select-none text-brand">$ </span>
          <span className="text-ink">{module.install}</span>
        </span>
        <CopyButton text={module.install} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        {module.license && <span>{module.license} license</span>}
        <span>
          {module.versions.length} version
          {module.versions.length === 1 ? "" : "s"}
        </span>
        {module.repository && (
          <a
            href={module.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted transition-colors hover:text-ink"
          >
            Source ↗
          </a>
        )}
      </div>
    </article>
  );
}
