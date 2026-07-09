import type { Module } from "@/lib/registry";

/** What `damat module add` actually does — same flow the docs describe. */
export function InstallSteps({ module }: { module: Module }) {
  const steps: Array<[string, string]> = [
    [
      "Resolve",
      `The ref ${module.installRef} is looked up in this registry's index and mapped to its pinned source.`,
    ],
    [
      "Verify",
      "The owner and verification status are checked against your DAMAT_MODULE_VERIFY policy.",
    ],
    [
      "Copy",
      `The module lands in src/modules/${module.name} — models, service, config, migrations, and workflows.`,
    ],
    [
      "Wire",
      `It is registered in damat.config.ts under the "${module.name}" id, and its env keys are synced to .env.example.`,
    ],
    [
      "Migrate",
      "You apply its schema with `bun damat-orm migrate:up`, then restart the dev server.",
    ],
  ];

  return (
    <ol className="space-y-0 divide-y divide-line rounded-xl border border-line bg-surface px-5">
      {steps.map(([title, body], i) => (
        <li key={title} className="flex gap-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-subtle font-mono text-2xs text-faint">
            {i + 1}
          </span>
          <span>
            <span className="text-sm font-medium text-ink">{title}</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-muted">
              {body}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
