import type { Command } from "@damatjs/cli";
import { createRemovePlan, readInstallerLock } from "@damatjs/installer";
import { executeModulePlan, reportModuleError } from "../shared";

export interface RemoveDependencies {
  readLock: typeof readInstallerLock;
  create: typeof createRemovePlan;
  execute: typeof executeModulePlan;
}

const dependencies: RemoveDependencies = {
  readLock: readInstallerLock,
  create: createRemovePlan,
  execute: executeModulePlan,
};

export function createModuleRemoveHandler(
  deps: RemoveDependencies = dependencies,
): Command["handler"] {
  return async (ctx) => {
    const name = ctx.args[0];
    if (!name) return { exitCode: 1 };
    try {
      const plan = deps.create({
        projectDir: ctx.cwd,
        installationId: name,
        lock: deps.readLock(ctx.cwd),
        confirmModified: Boolean(ctx.options.yes),
      });
      await deps.execute(ctx, plan);
      return { exitCode: 0 };
    } catch (error) {
      reportModuleError(ctx, error, "Failed to remove module");
      return { exitCode: 1 };
    }
  };
}

export const handleModuleRemove = createModuleRemoveHandler();
