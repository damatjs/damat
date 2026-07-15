import type { CommandContext } from "@damatjs/cli";
import type { KitPlan } from "../plan";

export function reportUnmatched(ctx: CommandContext, plan: KitPlan) {
  if (!plan.unmatched.length) return;
  ctx.logger.warn([
    `${plan.unmatched.length} file(s) matched no mapping and the kit declares no \`fallback\` — skipped:`,
    ...plan.unmatched.map((file) => `  - ${file}`),
  ].join("\n"));
}

export function reportDryRun(
  ctx: CommandContext,
  name: string,
  plan: KitPlan,
  packages: Record<string, string>,
) {
  ctx.logger.info([
    `Dry run — adding "${name}" would write:`,
    ...plan.files.map((file) =>
      `  ${file.source} -> ${file.target}${file.via === "fallback" ? "  (fallback)" : ""}`,
    ),
    ...(Object.keys(packages).length
      ? [`  + bun add ${Object.keys(packages).join(" ")}`]
      : []),
  ].join("\n"));
}
