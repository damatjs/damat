import { join, relative, sep } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";
import {
  readModuleManifest,
  locateModuleDir,
  evaluateVerification,
  validateModuleDir,
  MODULE_MANIFEST_FILENAME,
} from "@damatjs/module";
import type { ModuleSource } from "@damatjs/framework";
import {
  resolveModuleSource,
  installModuleSplit,
  moduleLayoutPaths,
  readModuleConfigEntry,
  deregisterModuleFromConfig,
  registerModuleInConfig,
  syncEnvVars,
  installModulePackages,
  collectModulePackages,
  invalidPackageSpecs,
  moduleIdError,
  modulesDirError,
  unverifiedSourceError,
} from "./helpers";

export const moduleUpdateCommand: Command = {
  name: "update",
  description: "Re-fetch an installed module from its recorded source and reinstall it",
  aliases: ["up", "upgrade"],
  usage: "damat module update <id> [--dir <path>] [--yes] [--allow-unverified] [--allow-scripts] [--dry-run]",
  examples: [
    "damat module update user-management --dry-run   # show what would change",
    "damat module update user-management --yes        # apply (overwrites local edits)",
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
      name: "yes",
      alias: "y",
      type: "boolean",
      description: "Apply the update (required — updating overwrites local edits to installed files)",
      default: false,
    },
    {
      name: "allow-unverified",
      type: "boolean",
      description: "Allow updating from a recorded path/git source (no registry verification)",
      default: false,
    },
    {
      name: "allow-scripts",
      type: "boolean",
      description: "Run dependency lifecycle scripts during bun add (skipped by default)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Show the version and file changes without writing anything",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const moduleId = ctx.args[0];
    if (!moduleId) {
      ctx.logger.error("Usage: damat module update <id>");
      return { exitCode: 1 };
    }
    const modulesDir = ctx.options.dir as string;
    const guardError = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
    if (guardError) {
      ctx.logger.error(guardError);
      return { exitCode: 1 };
    }

    const configPath = join(ctx.cwd, "damat.config.ts");
    const entry = readModuleConfigEntry(configPath, moduleId);
    const layout = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir);
    if (!entry || !existsSync(layout.moduleHome)) {
      ctx.logger.error(`Module "${moduleId}" is not installed — use \`damat module add\``);
      return { exitCode: 1 };
    }
    const recordedRef = entry.source?.ref;
    if (!recordedRef) {
      ctx.logger.error(
        `Module "${moduleId}" has no recorded source in damat.config.ts — ` +
          `re-install it with \`damat module add <source> --force\` instead`,
      );
      return { exitCode: 1 };
    }

    let resolved;
    try {
      resolved = await resolveModuleSource(recordedRef, ctx.cwd);
    } catch (e) {
      reportError(ctx.logger, e, { prefix: `Could not resolve recorded source "${recordedRef}"` });
      return { exitCode: 1 };
    }

    try {
      const sourceModuleDir = locateModuleDir(resolved.dir);
      const manifest = readModuleManifest(sourceModuleDir);
      const allowUnverified = Boolean(ctx.options["allow-unverified"]);

      // Same trust gate as add.
      if (resolved.registry) {
        const decision = evaluateVerification(resolved.registry.verification);
        ctx.logger.info("Source", {
          from: "registry",
          ref: resolved.origin.ref,
          owner: resolved.registry.owner?.namespace ?? "(unknown)",
          verification: decision.status,
        });
        if (!decision.allowed) {
          ctx.logger.error(`Refusing to update "${moduleId}": ${decision.message}`);
          return { exitCode: 1 };
        }
        if (decision.message) ctx.logger.warn(decision.message);
      } else {
        ctx.logger.info("Source", { from: resolved.origin.type, ref: resolved.origin.ref });
        const trustError = unverifiedSourceError(resolved.origin.type, allowUnverified);
        if (trustError) {
          ctx.logger.error(`Refusing to update "${moduleId}": ${trustError}`);
          return { exitCode: 1 };
        }
        const report = validateModuleDir(sourceModuleDir);
        if (!report.valid) {
          for (const error of report.errors) ctx.logger.error(error);
          ctx.logger.error(`Refusing to update "${moduleId}": module failed validation`);
          return { exitCode: 1 };
        }
      }

      const packages = collectModulePackages(resolved.dir, manifest);
      const badSpecs = invalidPackageSpecs(packages, { allowUnsafeRanges: allowUnverified });
      if (badSpecs.length > 0) {
        ctx.logger.error(
          `Refusing to update "${moduleId}" — unsafe package specs:\n  ` + badSpecs.join("\n  "),
        );
        return { exitCode: 1 };
      }

      // Version + file diff summary. The module home holds the non-split files
      // (models/service/config/migrations); routes/workflows/links/tests are
      // refreshed wholesale by the force re-install.
      const installedVersion = readInstalledVersion(layout.moduleHome);
      const diff = diffModuleHome(sourceModuleDir, layout.moduleHome);
      ctx.logger.info(`Update "${moduleId}"`, {
        installed: installedVersion ?? "(unknown)",
        incoming: manifest.version,
      });
      if (diff.added.length + diff.changed.length + diff.removed.length === 0) {
        ctx.logger.info("Module files are identical to the source — nothing to update");
      } else {
        const lines = [
          ...diff.added.map((f) => `  + ${f}`),
          ...diff.changed.map((f) => `  ~ ${f} (will be overwritten)`),
          ...diff.removed.map((f) => `  - ${f} (will be deleted)`),
        ];
        ctx.logger.info(
          [`File changes under ${relative(ctx.cwd, layout.moduleHome)}/:`, ...lines].join("\n"),
        );
        if (diff.changed.length > 0) {
          ctx.logger.warn(
            "Files marked ~ differ from the incoming version — any local edits to them will be lost",
          );
        }
      }

      if (ctx.options["dry-run"]) {
        ctx.logger.info("Dry run — nothing was written");
        return { exitCode: 0 };
      }
      if (!ctx.options.yes) {
        ctx.logger.error(
          `Re-run with --yes to apply (updating overwrites the module's installed files)`,
        );
        return { exitCode: 1 };
      }

      // Apply: force re-install through the same pipeline add uses.
      const installed = installModuleSplit(sourceModuleDir, {
        cwd: ctx.cwd,
        moduleId,
        modulesDir,
        packageDir: resolved.dir,
        force: true,
      });
      ctx.logger.success(`Updated module at ${relative(ctx.cwd, installed.moduleHome)}`);

      if (installed.workflowsTarget) {
        generateBarrels(join(ctx.cwd, "src", "workflows"), ctx.logger);
      }

      // Refresh the recorded provenance (new version + installedAt).
      const origin: ModuleSource = {
        ...resolved.origin,
        installedAt: new Date().toISOString(),
      };
      deregisterModuleFromConfig(configPath, moduleId);
      const relativeTarget = `./${join(modulesDir, moduleId)}`;
      if (registerModuleInConfig(configPath, moduleId, relativeTarget, origin)) {
        ctx.logger.success(`Refreshed "${moduleId}" provenance in damat.config.ts`);
      } else {
        ctx.logger.warn(
          `Could not update damat.config.ts automatically — re-add:\n` +
            `  "${moduleId}": { resolve: "${relativeTarget}", id: "${moduleId}" },`,
        );
      }

      const { addedToExample, missingInEnv } = syncEnvVars(ctx.cwd, manifest);
      if (addedToExample.length > 0) {
        ctx.logger.info(`Added to .env.example: ${addedToExample.join(", ")}`);
      }
      if (missingInEnv.length > 0) {
        ctx.logger.warn(`Set these in your .env before starting: ${missingInEnv.join(", ")}`);
      }

      if (Object.keys(packages).length > 0) {
        ctx.logger.info(`Installing packages: ${Object.keys(packages).join(", ")}`);
        const install = installModulePackages(ctx.cwd, packages, {
          allowScripts: Boolean(ctx.options["allow-scripts"]),
        });
        if (install.ok) {
          ctx.logger.success("Packages installed");
        } else {
          ctx.logger.error(`bun add failed:\n${install.output}`);
          return { exitCode: 1 };
        }
      }

      ctx.logger.info(
        [
          "Next steps:",
          "  1. bun damat-orm migrate:up    # apply any new migrations",
          "  2. restart the dev server",
        ].join("\n"),
      );
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Failed to update module" });
      return { exitCode: 1 };
    } finally {
      resolved.cleanup();
    }
  },
};

/** The installed module's manifest version, if readable. */
function readInstalledVersion(moduleHome: string): string | null {
  const manifestPath = join(moduleHome, MODULE_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) return null;
  try {
    return (JSON.parse(readFileSync(manifestPath, "utf-8")).version as string) ?? null;
  } catch {
    return null;
  }
}

interface ModuleDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

/**
 * Compare the incoming module (minus the split-out api/workflows/links/tests
 * subtrees) against what is installed under the module home. Content compare,
 * relative paths, sorted.
 */
function diffModuleHome(sourceModuleDir: string, moduleHome: string): ModuleDiff {
  const skip = new Set(["api", "workflows", "links", "tests", ".git", "node_modules"]);
  const sourceFiles = listFiles(sourceModuleDir, skip);
  const installedFiles = existsSync(moduleHome) ? listFiles(moduleHome, skip) : new Map();

  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [rel, content] of sourceFiles) {
    const installed = installedFiles.get(rel);
    if (installed === undefined) added.push(rel);
    else if (installed !== content) changed.push(rel);
  }
  for (const rel of installedFiles.keys()) {
    if (!sourceFiles.has(rel)) removed.push(rel);
  }
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

/** Map of relative path → file content for a tree, skipping top-level dirs in `skip`. */
function listFiles(root: string, skip: Set<string>): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      if (rel === "" && skip.has(entry)) continue;
      if (entry === ".git" || entry === "node_modules") continue;
      const abs = join(dir, entry);
      const entryRel = rel === "" ? entry : `${rel}${sep}${entry}`;
      if (statSync(abs).isDirectory()) walk(abs, entryRel);
      else files.set(entryRel, readFileSync(abs, "utf-8"));
    }
  };
  if (existsSync(root)) walk(root, "");
  return files;
}
