import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { moduleLayoutPaths } from "../helpers";
import type { AddState } from "./types";

export function reportAddDryRun(ctx: CommandContext, state: AddState) {
  const {
    sourceModuleDir,
    manifest,
    moduleId,
    modulesDir,
    relativeTarget,
    packages,
  } = state;
  const layout = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir);
  const actions = [
    `install module files to ${relative(ctx.cwd, layout.moduleHome)}/`,
    ...(existsSync(join(sourceModuleDir, "api", "routes"))
      ? [`install routes to ${relative(ctx.cwd, layout.apiTarget)}/`]
      : []),
    ...(existsSync(join(sourceModuleDir, "workflows"))
      ? [
          `install workflows to ${relative(ctx.cwd, layout.workflowsTarget)}/ and rebuild barrels`,
        ]
      : []),
    ...(existsSync(join(sourceModuleDir, "links"))
      ? [`install links to ${relative(ctx.cwd, layout.linksTarget)}/`]
      : []),
    `register "${moduleId}" in damat.config.ts (resolve: "${relativeTarget}")`,
    `ensure "@${moduleId}/*" + "@workflows" aliases in tsconfig.json`,
    ...((manifest.env ?? []).length
      ? [
          `sync env vars into .env.example: ${(manifest.env ?? []).map((item) => item.name).join(", ")}`,
        ]
      : []),
    ...(Object.keys(packages).length
      ? [`bun add ${Object.keys(packages).join(" ")}`]
      : []),
  ];
  ctx.logger.info(
    [
      `Dry run — adding "${moduleId}" would:`,
      ...actions.map((action) => `  - ${action}`),
    ].join("\n"),
  );
}
