import { join, relative } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";
import { MODULE_MANIFEST_FILENAME } from "@damatjs/module";
import type { ModuleManifest } from "@damatjs/module";
import {
  moduleLayoutPaths,
  removeModuleSplit,
  readModuleConfigEntry,
  deregisterModuleFromConfig,
  removeModuleTsconfigPaths,
  removeModuleEnvVars,
  moduleIdError,
  modulesDirError,
} from "./helpers";

export const moduleRemoveCommand: Command = {
  name: "remove",
  description: "Remove an installed module from this app (inverse of module add)",
  aliases: ["rm", "uninstall"],
  usage: "damat module remove <id> [--dir <path>] [--force] [--clean-env] [--dry-run]",
  examples: [
    "damat module remove user-management",
    "damat module remove user-management --dry-run   # show what would be deleted",
    "damat module remove user-management --force     # even if other modules depend on it",
  ],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory the module was installed into",
      default: "src/modules",
    },
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description: "Remove even when other installed modules depend on this one",
      default: false,
    },
    {
      name: "clean-env",
      type: "boolean",
      description:
        "Also remove the module's env block from .env.example (.env is never touched)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Print what would be removed without deleting anything",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const moduleId = ctx.args[0];
    if (!moduleId) {
      ctx.logger.error("Usage: damat module remove <id>");
      return { exitCode: 1 };
    }
    const modulesDir = ctx.options.dir as string;
    const dryRun = Boolean(ctx.options["dry-run"]);

    // Same traversal defense as add: the id and dir become filesystem paths.
    const guardError = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
    if (guardError) {
      ctx.logger.error(guardError);
      return { exitCode: 1 };
    }

    try {
      const configPath = join(ctx.cwd, "damat.config.ts");
      const entry = readModuleConfigEntry(configPath, moduleId);
      const layout = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir);

      const targets = [
        layout.moduleHome,
        layout.apiTarget,
        layout.workflowsTarget,
        layout.linksTarget,
        layout.testsTarget,
      ].filter((t) => existsSync(t));

      if (targets.length === 0 && !entry) {
        ctx.logger.error(`Module "${moduleId}" is not installed (nothing to remove)`);
        return { exitCode: 1 };
      }

      // Refuse while other installed modules declare this one as a dependency —
      // deleting it would leave them broken at boot.
      const dependents = findDependents(ctx.cwd, modulesDir, moduleId);
      if (dependents.length > 0 && !ctx.options.force) {
        ctx.logger.error(
          `Refusing to remove "${moduleId}" — these installed modules depend on it:\n  ` +
            dependents.join("\n  ") +
            `\nRemove them first, or re-run with --force.`,
        );
        return { exitCode: 1 };
      }
      if (dependents.length > 0) {
        ctx.logger.warn(
          `Removing "${moduleId}" although ${dependents.join(", ")} depend(s) on it (--force)`,
        );
      }

      // The manifest must be read BEFORE deletion — it drives env cleanup.
      const manifest = readInstalledManifest(layout.moduleHome);

      // Everything is resolved and validated: from here on we either print the
      // plan (--dry-run) or execute it.
      const plannedActions = [
        ...targets.map((t) => `delete ${relative(ctx.cwd, t)}/`),
        ...(entry ? [`deregister "${moduleId}" from damat.config.ts`] : []),
        `remove "@${moduleId}/*" alias from tsconfig.json (if present)`,
        ...(ctx.options["clean-env"] && manifest
          ? [`remove the "# --- module: ${manifest.name} ---" block from .env.example`]
          : []),
      ];

      if (dryRun) {
        ctx.logger.info(
          [`Dry run — removing "${moduleId}" would:`, ...plannedActions.map((a) => `  - ${a}`)].join("\n"),
        );
        return { exitCode: 0 };
      }

      const { removed, linksRegenerated } = removeModuleSplit(ctx.cwd, moduleId, modulesDir);
      for (const path of removed) {
        ctx.logger.success(`Removed ${relative(ctx.cwd, path)}`);
      }
      if (linksRegenerated) {
        ctx.logger.info("Regenerated src/links/index.ts aggregator");
      }

      // Rebuild the app's workflow barrels so `@workflows` no longer re-exports
      // the removed module's workflows.
      if (removed.includes(layout.workflowsTarget)) {
        generateBarrels(join(ctx.cwd, "src", "workflows"), ctx.logger);
      }

      if (entry) {
        if (deregisterModuleFromConfig(configPath, moduleId)) {
          ctx.logger.success(`Deregistered "${moduleId}" from damat.config.ts`);
        } else {
          ctx.logger.warn(
            `Could not update damat.config.ts automatically — delete the "${moduleId}" entry from its modules block`,
          );
        }
      }

      const tsResult = removeModuleTsconfigPaths(ctx.cwd, moduleId);
      if (tsResult === "updated") {
        ctx.logger.success(`Removed "@${moduleId}/*" alias from tsconfig.json`);
      } else if (tsResult === "skipped") {
        ctx.logger.warn(
          `Could not update tsconfig.json automatically — remove "@${moduleId}/*" from compilerOptions.paths`,
        );
      }

      if (ctx.options["clean-env"] && manifest) {
        const removedVars = removeModuleEnvVars(ctx.cwd, manifest.name);
        if (removedVars.length > 0) {
          ctx.logger.info(`Removed from .env.example: ${removedVars.join(", ")}`);
          ctx.logger.warn(
            `Values in .env were left untouched — remove ${removedVars.join(", ")} yourself if nothing else uses them`,
          );
        }
      }

      ctx.logger.info(
        [
          "Next steps:",
          "  1. Review your database — the module's tables/migrations were NOT rolled back",
          "  2. bun remove <pkg>            # if packages were installed only for this module",
          "  3. restart the dev server",
        ].join("\n"),
      );

      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Failed to remove module" });
      return { exitCode: 1 };
    }
  },
};

/** Other installed modules whose manifest lists `moduleId` as a dependency. */
function findDependents(cwd: string, modulesDir: string, moduleId: string): string[] {
  const root = join(cwd, modulesDir);
  if (!existsSync(root)) return [];
  const dependents: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === moduleId) continue;
    const manifest = readInstalledManifest(join(root, entry.name));
    if (manifest?.modules?.includes(moduleId)) dependents.push(entry.name);
  }
  return dependents;
}

/** Best-effort read of an installed module's module.json (null when absent/invalid). */
function readInstalledManifest(moduleHome: string): ModuleManifest | null {
  const manifestPath = join(moduleHome, MODULE_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as ModuleManifest;
  } catch {
    return null;
  }
}
