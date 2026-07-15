import { reportError, type Command } from "@damatjs/cli";
import { installPackages, invalidPackageSpecs } from "@damatjs/cli-support";
import { readKitManifest } from "../manifest";
import { buildKitPlan } from "../plan";
import { resolveKitSource } from "../source";
import { copyPlanned } from "./copyPlanned";
import { recordInstalledKit, KIT_RECORD_FILENAME } from "./recordInstalledKit";
import { reportDryRun, reportUnmatched } from "./reportPlan";

export const handleKitAdd: Command["handler"] = async (ctx) => {
  const source = ctx.args[0];
  if (!source) {
    ctx.logger.error("Usage: damat kit add <source>");
    return { exitCode: 1 };
  }
  let resolved;
  try {
    resolved = resolveKitSource(source, ctx.cwd);
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Could not resolve kit source" });
    return { exitCode: 1 };
  }
  try {
    const manifest = readKitManifest(resolved.dir);
    const plan = buildKitPlan(resolved.dir, manifest);
    const packages = manifest.packages ?? {};
    ctx.logger.info(`Kit "${manifest.name}"`, {
      ...(manifest.version ? { version: manifest.version } : {}),
      ...(manifest.description ? { description: manifest.description } : {}),
      files: plan.files.length,
    });
    const invalid = invalidPackageSpecs(packages);
    if (invalid.length) {
      ctx.logger.error(`Refusing to add "${manifest.name}" — unsafe package specs:\n  ${invalid.join("\n  ")}`);
      return { exitCode: 1 };
    }
    reportUnmatched(ctx, plan);
    if (ctx.options["dry-run"]) {
      reportDryRun(ctx, manifest.name, plan, packages);
      return { exitCode: 0 };
    }
    const copied = copyPlanned(resolved.dir, ctx.cwd, plan.files, Boolean(ctx.options.force));
    ctx.logger.success(`Installed ${copied.written.length} file(s) from "${manifest.name}"`);
    if (copied.skipped.length) ctx.logger.warn(`${copied.skipped.length} file(s) already existed and were kept — re-run with --force to overwrite:\n  ${copied.skipped.map((file) => file.target).join("\n  ")}`);
    recordInstalledKit(ctx.cwd, {
      name: manifest.name,
      ...(manifest.version ? { version: manifest.version } : {}),
      source: resolved.origin.ref,
      sourceType: resolved.origin.type,
      installedAt: new Date().toISOString(),
      files: plan.files.map((file) => file.target),
    });
    ctx.logger.info(`Recorded the kit in ${KIT_RECORD_FILENAME}`);
    if (ctx.options.install && Object.keys(packages).length) {
      ctx.logger.info(`Installing packages: ${Object.keys(packages).join(", ")}`);
      const result = installPackages(ctx.cwd, packages, { allowScripts: Boolean(ctx.options["allow-scripts"]) });
      if (!result.ok) { ctx.logger.error(`bun add failed:\n${result.output}`); return { exitCode: 1 }; }
      ctx.logger.success("Packages installed");
    }
    if (manifest.notes) ctx.logger.info(`Notes from "${manifest.name}":\n${manifest.notes}`);
    return { exitCode: 0 };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Failed to add kit" });
    return { exitCode: 1 };
  } finally {
    resolved.cleanup();
  }
};
