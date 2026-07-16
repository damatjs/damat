import type { CommandContext } from "@damatjs/cli";
import {
  createInstallPlan, createUpdatePlan, readInstallerLock, type OriginRequest,
} from "@damatjs/installer";
import { resolveModuleInstall } from "./resolve";

export interface PlanDependencies {
  resolve: typeof resolveModuleInstall;
  install: typeof createInstallPlan;
  update: typeof createUpdatePlan;
  readLock: typeof readInstallerLock;
}

const dependencies: PlanDependencies = {
  resolve: resolveModuleInstall,
  install: createInstallPlan,
  update: createUpdatePlan,
  readLock: readInstallerLock,
};

export async function buildModuleInstallPlan(
  ctx: CommandContext,
  source: string | OriginRequest,
  action: "add" | "update" = "add",
  deps: PlanDependencies = dependencies,
) {
  const resolved = await deps.resolve(ctx, source);
  const input = {
    projectDir: ctx.cwd,
    artifact: resolved.artifact,
    recipe: resolved.recipe,
    lock: deps.readLock(ctx.cwd),
    ...(resolved.options.mode && { mode: resolved.options.mode }),
    ...(resolved.options.packageBackend && {
      packageBackend: resolved.options.packageBackend,
    }),
    ...(resolved.provider.install?.packageBackends && {
      supportedPackageBackends: resolved.provider.install.packageBackends,
    }),
    experimentalPackage: Boolean(ctx.options["experimental-package"]),
    confirmModified: Boolean(ctx.options.yes),
  };
  const plan = action === "update"
    ? await deps.update(input)
    : deps.install(input);
  return { ...resolved, plan };
}
