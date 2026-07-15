import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { locateModuleDir, readModuleManifest } from "@damatjs/module";
import {
  collectModulePackages,
  invalidPackageSpecs,
  moduleIdError,
  modulesDirError,
} from "../helpers";
import type { ResolvedModuleSource } from "../helpers";
import type { AddState } from "./types";
import { verifyAddSource } from "./trust";

export function prepareAdd(
  ctx: CommandContext,
  resolved: ResolvedModuleSource,
): AddState | null {
  const sourceModuleDir = locateModuleDir(resolved.dir);
  const manifest = readModuleManifest(sourceModuleDir);
  const moduleId = (ctx.options.name as string) || manifest.name;
  const modulesDir = ctx.options.dir as string;
  const guard = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
  if (guard) {
    ctx.logger.error(guard);
    return null;
  }
  const targetDir = join(ctx.cwd, modulesDir, moduleId);
  const relativeTarget = `./${join(modulesDir, moduleId)}`;
  ctx.logger.info(`Adding module "${moduleId}"`, {
    version: manifest.version,
    description: manifest.description,
  });
  if (!verifyAddSource(ctx, resolved, sourceModuleDir, moduleId)) return null;
  const packages = collectModulePackages(resolved.dir, manifest);
  const invalid = invalidPackageSpecs(packages, {
    allowUnsafeRanges: Boolean(ctx.options["allow-unverified"]),
  });
  if (invalid.length) {
    ctx.logger.error(
      `Refusing to install "${moduleId}" — unsafe package specs:\n  ${invalid.join("\n  ")}`,
    );
    return null;
  }
  for (const dependency of manifest.modules ?? []) {
    if (!existsSync(join(ctx.cwd, modulesDir, dependency))) {
      ctx.logger.warn(
        `Module "${moduleId}" depends on module "${dependency}" which is not installed`,
      );
    }
  }
  if (existsSync(targetDir) && !ctx.options.force) {
    ctx.logger.error(
      `${relative(ctx.cwd, targetDir)} already exists — use --force to overwrite`,
    );
    return null;
  }
  return {
    resolved,
    sourceModuleDir,
    manifest,
    moduleId,
    modulesDir,
    targetDir,
    relativeTarget,
    packages,
  };
}
