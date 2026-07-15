import { join, relative } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";
import { asToolingLogger } from "../../../toolingLogger";
import { installModulePackages, installModuleSplit } from "../helpers";
import { configureInstalledModule } from "./configure";
import type { AddState } from "./types";

export function installPreparedModule(
  ctx: CommandContext,
  state: AddState,
): boolean {
  const layout = installModuleSplit(state.sourceModuleDir, {
    cwd: ctx.cwd,
    moduleId: state.moduleId,
    modulesDir: state.modulesDir,
    packageDir: state.resolved.dir,
    force: Boolean(ctx.options.force),
  });
  ctx.logger.success(
    `Installed module to ${relative(ctx.cwd, layout.moduleHome)}`,
  );
  for (const [label, target] of [
    ["routes", layout.apiTarget],
    ["workflows", layout.workflowsTarget],
    ["links", layout.linksTarget],
    ["tests", layout.testsTarget],
  ])
    if (target) ctx.logger.info(`  ${label} → ${relative(ctx.cwd, target)}`);
  if (layout.workflowsTarget)
    generateBarrels(
      join(ctx.cwd, "src", "workflows"),
      asToolingLogger(ctx.logger),
    );
  configureInstalledModule(ctx, state, Boolean(layout.linksTarget));
  if (Object.keys(state.packages).length) {
    ctx.logger.info(
      `Installing packages: ${Object.keys(state.packages).join(", ")}`,
    );
    const result = installModulePackages(ctx.cwd, state.packages, {
      allowScripts: Boolean(ctx.options["allow-scripts"]),
    });
    if (!result.ok) {
      ctx.logger.error(`bun add failed:\n${result.output}`);
      return false;
    }
    ctx.logger.success("Packages installed");
  }
  ctx.logger.info(
    [
      "Next steps:",
      "  1. bun damat-orm migrate:up    # apply the module's migrations",
      "  2. restart the dev server      # the module self-registers via damat.config.ts",
      ...(layout.linksTarget
        ? [
            `  3. bun damat-orm migrate:create link:${state.moduleId}   # generate the link junction migration`,
            "  4. bun damat-orm migrate:up                        # create the junction table(s)",
            `  5. damat codegen ${state.moduleId}                       # regenerate types incl. link fields`,
          ]
        : []),
    ].join("\n"),
  );
  return true;
}
