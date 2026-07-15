import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import {
  moduleIdError,
  moduleLayoutPaths,
  modulesDirError,
  readModuleConfigEntry,
} from "../helpers";

export interface UpdateTarget {
  moduleId: string;
  modulesDir: string;
  configPath: string;
  moduleHome: string;
  reference: string;
}

export function prepareUpdate(ctx: CommandContext): UpdateTarget | null {
  const moduleId = ctx.args[0];
  if (!moduleId) return fail(ctx, "Usage: damat module update <id>");
  const modulesDir = ctx.options.dir as string;
  const guard = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
  if (guard) return fail(ctx, guard);
  const configPath = join(ctx.cwd, "damat.config.ts");
  const entry = readModuleConfigEntry(configPath, moduleId);
  const moduleHome = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir).moduleHome;
  if (!entry || !existsSync(moduleHome))
    return fail(
      ctx,
      `Module "${moduleId}" is not installed — use \`damat module add\``,
    );
  const reference = entry.source?.ref;
  if (!reference)
    return fail(
      ctx,
      `Module "${moduleId}" has no recorded source in damat.config.ts — re-install it with \`damat module add <source> --force\` instead`,
    );
  return { moduleId, modulesDir, configPath, moduleHome, reference };
}

function fail(ctx: CommandContext, message: string): null {
  ctx.logger.error(message);
  return null;
}
