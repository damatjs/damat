import type { CommandContext } from "@damatjs/cli";
import {
  createInstallPlan,
  createUpdatePlan,
  readInstallerLock,
  type OriginRequest,
} from "@damatjs/installer";
import { resolveKitInstall } from "./resolve";

export async function buildKitInstallPlan(
  ctx: CommandContext,
  source: string | OriginRequest,
  action: "add" | "update" = "add",
) {
  const resolved = await resolveKitInstall(ctx, source);
  const input = {
    projectDir: ctx.cwd,
    artifact: resolved.artifact,
    recipe: resolved.recipe,
    lock: readInstallerLock(ctx.cwd),
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
    ? await createUpdatePlan(input)
    : createInstallPlan(input);
  return { ...resolved, plan };
}
