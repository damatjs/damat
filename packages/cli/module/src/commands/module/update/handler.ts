import {
  reportError,
  type CommandContext,
  type CommandResult,
} from "@damatjs/cli";
import { locateModuleDir, readModuleManifest } from "@damatjs/module";
import {
  collectModulePackages,
  invalidPackageSpecs,
  resolveModuleSource,
} from "../helpers";
import { applyModuleUpdate } from "./apply";
import { diffModuleHome, readInstalledVersion } from "./diff";
import { printUpdateSummary } from "./summary";
import { verifyUpdateSource } from "./trust";
import { prepareUpdate } from "./prepare";
import { failCommand } from "../fail";

export async function handleModuleUpdate(
  ctx: CommandContext,
): Promise<CommandResult> {
  const target = prepareUpdate(ctx);
  if (!target) return { exitCode: 1 };
  const { moduleId, modulesDir, configPath, moduleHome, reference } = target;
  let resolved;
  try {
    resolved = await resolveModuleSource(reference, ctx.cwd);
  } catch (error) {
    reportError(ctx.logger, error, {
      prefix: `Could not resolve recorded source "${reference}"`,
    });
    return { exitCode: 1 };
  }
  try {
    const sourceDir = locateModuleDir(resolved.dir);
    const manifest = readModuleManifest(sourceDir);
    if (!verifyUpdateSource(ctx, resolved, sourceDir, moduleId))
      return { exitCode: 1 };
    const packages = collectModulePackages(resolved.dir, manifest);
    const unsafe = invalidPackageSpecs(packages, {
      allowUnsafeRanges: Boolean(ctx.options["allow-unverified"]),
    });
    if (unsafe.length)
      return failCommand(
        ctx,
        `Refusing to update "${moduleId}" — unsafe package specs:\n  ${unsafe.join("\n  ")}`,
      );
    const diff = diffModuleHome(sourceDir, moduleHome);
    printUpdateSummary(
      ctx,
      moduleId,
      moduleHome,
      readInstalledVersion(moduleHome),
      manifest.version,
      diff,
    );
    if (ctx.options["dry-run"]) {
      ctx.logger.info("Dry run — nothing was written");
      return { exitCode: 0 };
    }
    if (!ctx.options.yes)
      return failCommand(
        ctx,
        `Re-run with --yes to apply (updating overwrites the module's installed files)`,
      );
    return {
      exitCode: applyModuleUpdate(
        ctx,
        moduleId,
        modulesDir,
        configPath,
        resolved,
        sourceDir,
        manifest,
        packages,
      )
        ? 0
        : 1,
    };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Failed to update module" });
    return { exitCode: 1 };
  } finally {
    resolved.cleanup();
  }
}
