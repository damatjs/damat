import { join, relative } from "node:path";
import { existsSync, rmSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { readModuleManifest, locateModuleDir, evaluateVerification } from "@damatjs/module";
import type { ModuleSource } from "@damatjs/framework";
import {
  resolveModuleSource,
  copyModule,
  registerModuleInConfig,
  syncEnvVars,
  installModulePackages,
  collectModulePackages,
} from "./helpers";

export const moduleAddCommand: Command = {
  name: "add",
  description: "Add a module to this app from the registry, a path, or git (shadcn-style)",
  usage: "damat module add <source> [--name <id>] [--dir <path>] [--force]",
  examples: [
    "damat module add user-management            # registry ref (DAMAT_MODULE_REGISTRY)",
    "damat module add damatjs/user-management@0.0.1",
    "damat module add ./local/path/to/module-package",
    "damat module add https://github.com/damatjs/modules.git#main",
  ],
  options: [
    {
      name: "name",
      alias: "n",
      type: "string",
      description: "Override the module id (defaults to manifest name)",
    },
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Target modules directory",
      default: "src/modules",
    },
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description: "Overwrite if the target module directory already exists",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const source = ctx.args[0];
    if (!source) {
      ctx.logger.error("Usage: damat module add <source>");
      return { exitCode: 1 };
    }

    let resolved;
    try {
      resolved = await resolveModuleSource(source, ctx.cwd);
    } catch (e) {
      ctx.logger.error(e instanceof Error ? e.message : String(e));
      return { exitCode: 1 };
    }

    try {
      // Package layout keeps the module in src/; legacy keeps it at the root.
      const sourceModuleDir = locateModuleDir(resolved.dir);
      const manifest = readModuleManifest(sourceModuleDir);
      const moduleId = (ctx.options.name as string) || manifest.name;
      const modulesDir = ctx.options.dir as string;
      const targetDir = join(ctx.cwd, modulesDir, moduleId);
      const relativeTarget = `./${join(modulesDir, moduleId)}`;

      ctx.logger.info(`Adding module "${moduleId}"`, {
        version: manifest.version,
        description: manifest.description,
      });

      // Provenance + verification gate. Registry installs carry a verifiable
      // owner and a verification status the registry stamped; path/git sources
      // are trusted as-is (the user pointed at them directly).
      if (resolved.registry) {
        const decision = evaluateVerification(resolved.registry.verification);
        ctx.logger.info("Source", {
          from: "registry",
          ref: resolved.origin.ref,
          owner: resolved.registry.owner?.namespace ?? "(unknown)",
          verification: decision.status,
        });
        if (!decision.allowed) {
          ctx.logger.error(`Refusing to install "${moduleId}": ${decision.message}`);
          return { exitCode: 1 };
        }
        if (decision.message) ctx.logger.warn(decision.message);
      } else {
        ctx.logger.info("Source", {
          from: resolved.origin.type,
          ref: resolved.origin.ref,
        });
      }

      // Unmet module dependencies are a warning, not a blocker
      for (const dep of manifest.modules ?? []) {
        const depDir = join(ctx.cwd, modulesDir, dep);
        if (!existsSync(depDir)) {
          ctx.logger.warn(
            `Module "${moduleId}" depends on module "${dep}" which is not installed`,
          );
        }
      }

      if (existsSync(targetDir)) {
        if (!ctx.options.force) {
          ctx.logger.error(
            `${relative(ctx.cwd, targetDir)} already exists — use --force to overwrite`,
          );
          return { exitCode: 1 };
        }
        rmSync(targetDir, { recursive: true, force: true });
      }

      // Only the module source is inserted — package scaffolding (tests,
      // package.json, module.config.ts) stays with the standalone package.
      copyModule(sourceModuleDir, targetDir);
      ctx.logger.success(`Copied module to ${relative(ctx.cwd, targetDir)}`);

      // Register in damat.config.ts, recording where the module came from
      const configPath = join(ctx.cwd, "damat.config.ts");
      const origin: ModuleSource = {
        ...resolved.origin,
        installedAt: new Date().toISOString(),
      };
      const registered = registerModuleInConfig(
        configPath,
        moduleId,
        relativeTarget,
        origin,
      );
      if (registered) {
        ctx.logger.success(`Registered "${moduleId}" in damat.config.ts`);
      } else {
        ctx.logger.warn(
          `Could not update damat.config.ts automatically — add this to your modules block:\n` +
            `  "${moduleId}": { resolve: "${relativeTarget}", id: "${moduleId}" },`,
        );
      }

      // Env vars
      const { addedToExample, missingInEnv } = syncEnvVars(ctx.cwd, manifest);
      if (addedToExample.length > 0) {
        ctx.logger.info(`Added to .env.example: ${addedToExample.join(", ")}`);
      }
      if (missingInEnv.length > 0) {
        ctx.logger.warn(
          `Set these in your .env before starting: ${missingInEnv.join(", ")}`,
        );
      }

      // npm packages: the module package's own deps + manifest overrides
      const packages = collectModulePackages(resolved.dir, manifest);
      if (Object.keys(packages).length > 0) {
        ctx.logger.info(`Installing packages: ${Object.keys(packages).join(", ")}`);
        const install = installModulePackages(ctx.cwd, packages);
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
          `  1. bun damat-orm migrate:up    # apply the module's migrations`,
          `  2. restart the dev server      # the module self-registers via damat.config.ts`,
        ].join("\n"),
      );

      return { exitCode: 0 };
    } catch (e) {
      ctx.logger.error(e instanceof Error ? e.message : String(e));
      return { exitCode: 1 };
    } finally {
      resolved.cleanup();
    }
  },
};
