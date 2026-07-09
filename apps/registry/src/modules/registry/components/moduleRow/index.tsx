import Link from "next/link";
import { TagIcon } from "@/assets/icons/tag";
import { installCommand, type Module } from "@/lib/registry";
import { InstallSnippet } from "@/modules/registry/components/installSnippet";
import { VerifiedBadge } from "@/modules/registry/components/verifiedBadge";

/** One detailed row in the browse list (npm-style). */
export function ModuleRow({ module }: { module: Module }) {
  return (
    <article className="px-5 py-5 transition-colors hover:bg-subtle/60 sm:px-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href={`/modules/${module.key}`}
          className="font-mono text-md font-medium text-ink underline-offset-4 hover:text-brand hover:underline"
        >
          {module.namespace && (
            <span className="text-faint">{module.namespace}/</span>
          )}
          {module.name}
        </Link>
        {module.latest && (
          <span className="font-mono text-xs text-faint">v{module.latest}</span>
        )}
        <VerifiedBadge module={module} />
      </div>

      {module.description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {module.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="font-mono text-2xs uppercase tracking-widest text-faint">
          {module.namespace ? `owner ${module.namespace}` : "no owner"}
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest text-faint">
          {module.versions.length} version
          {module.versions.length === 1 ? "" : "s"}
        </span>
        {module.license && (
          <span className="font-mono text-2xs uppercase tracking-widest text-faint">
            {module.license}
          </span>
        )}
        {module.keywords.slice(0, 5).map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 rounded border border-line bg-subtle px-1.5 py-0.5 text-2xs text-muted"
          >
            <TagIcon width={10} height={10} className="text-faint" />
            {kw}
          </span>
        ))}
      </div>

      <InstallSnippet
        command={installCommand(module, module.latest)}
        className="mt-4 max-w-md"
      />
    </article>
  );
}
