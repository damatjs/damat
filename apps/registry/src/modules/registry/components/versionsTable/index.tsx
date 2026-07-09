import type { Module } from "@/lib/registry";
import { CopyButton } from "@/modules/common/components/copyButton";

/** Full version history — each release pins an immutable source. */
export function VersionsTable({ module }: { module: Module }) {
  if (module.versions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-sm text-muted">
        No pinned versions yet — installs resolve the module&apos;s default
        source (<code className="font-mono text-code">{module.source}</code>).
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-subtle/60 text-left font-mono text-2xs uppercase tracking-widest text-faint">
            <th className="px-4 py-2.5 font-medium">Version</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">
              Pinned source
            </th>
            <th className="px-4 py-2.5 font-medium">Install</th>
          </tr>
        </thead>
        <tbody>
          {module.versions.map((v) => {
            const ref = `${module.installRef}@${v.version}`;
            return (
              <tr
                key={v.version}
                className="border-b border-line last:border-0"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-ink">
                  {v.version}
                  {v.version === module.latest && (
                    <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-2xs font-medium text-brand">
                      latest
                    </span>
                  )}
                </td>
                <td className="hidden max-w-0 px-4 py-2.5 md:table-cell">
                  <span
                    className="block truncate font-mono text-code text-muted"
                    title={v.source}
                  >
                    {v.source}
                  </span>
                </td>
                <td className="px-4 py-1.5">
                  <span className="flex items-center gap-1">
                    <code className="truncate font-mono text-code text-muted">
                      damat module add {ref}
                    </code>
                    <CopyButton text={`damat module add ${ref}`} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
