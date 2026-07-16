import { reportError, type Command } from "@damatjs/cli";
import { readInstallerLock } from "@damatjs/installer";
import { buildModuleInstallPlan, executeModulePlan } from "../shared";

export interface UpdateDependencies {
  readLock: typeof readInstallerLock;
  build: typeof buildModuleInstallPlan;
  execute: typeof executeModulePlan;
}

const dependencies: UpdateDependencies = {
  readLock: readInstallerLock,
  build: buildModuleInstallPlan,
  execute: executeModulePlan,
};

export function createModuleUpdateHandler(
  deps: UpdateDependencies = dependencies,
): Command["handler"] {
  return async (ctx) => {
    const name = ctx.args[0];
    const record = name ? deps.readLock(ctx.cwd).installations[name] : undefined;
    if (!record || record.kind !== "module") {
      ctx.logger.error(`module installation not found: ${name ?? ""}`);
      return { exitCode: 1 };
    }
    try {
      const resolved = await deps.build(ctx, record.provenance.request, "update");
      try {
        await deps.execute(ctx, resolved.plan, resolved.provider);
      } finally {
        resolved.artifact.cleanup();
      }
      return { exitCode: 0 };
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to update module" });
      return { exitCode: 1 };
    }
  };
}

export const handleModuleUpdate = createModuleUpdateHandler();
