import { relative } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import type { ModuleDiff } from "./diff";

export function printUpdateSummary(
  ctx: CommandContext,
  moduleId: string,
  moduleHome: string,
  installed: string | null,
  incoming: string | undefined,
  diff: ModuleDiff,
): void {
  ctx.logger.info(`Update "${moduleId}"`, {
    installed: installed ?? "(unknown)",
    incoming,
  });
  if (!diff.added.length && !diff.changed.length && !diff.removed.length) {
    ctx.logger.info(
      "Module files are identical to the source — nothing to update",
    );
    return;
  }
  const lines = [
    ...diff.added.map((file) => `  + ${file}`),
    ...diff.changed.map((file) => `  ~ ${file} (will be overwritten)`),
    ...diff.removed.map((file) => `  - ${file} (will be deleted)`),
  ];
  ctx.logger.info(
    [`File changes under ${relative(ctx.cwd, moduleHome)}/:`, ...lines].join(
      "\n",
    ),
  );
  if (diff.changed.length)
    ctx.logger.warn(
      "Files marked ~ differ from the incoming version — any local edits to them will be lost",
    );
}
