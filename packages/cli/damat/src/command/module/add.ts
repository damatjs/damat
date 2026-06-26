import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";

import { readModuleManifest, locateModuleDir, evaluateVerification } from "@damatjs/module";
import type { ModuleSource } from "@damatjs/framework";
import {
  resolveModuleSource,
  installModuleSplit,
  registerModuleInConfig,
  registerModuleTsconfigPaths,
  syncEnvVars,
  syncLinkDrafts,
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
      reportError(ctx.logger, e, { prefix: "Could not resolve module source" });
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

      if (existsSync(targetDir) && !ctx.options.force) {
        ctx.logger.error(
          `${relative(ctx.cwd, targetDir)} already exists — use --force to overwrite`,
        );
        return { exitCode: 1 };
      }

      // Split the module across the app's layers (the package scaffolding —
      // tests, package.json, module.config.ts — stays with the standalone
      // package): routes → src/api/routes/<id>, workflows → src/workflows/<id>,
      // everything else → src/modules/<id>.
      const layout = installModuleSplit(sourceModuleDir, {
        cwd: ctx.cwd,
        moduleId,
        modulesDir,
        packageDir: resolved.dir,
        force: Boolean(ctx.options.force),
      });
      ctx.logger.success(
        `Installed module to ${relative(ctx.cwd, layout.moduleHome)}`,
      );
      if (layout.apiTarget) {
        ctx.logger.info(`  routes → ${relative(ctx.cwd, layout.apiTarget)}`);
      }
      if (layout.workflowsTarget) {
        ctx.logger.info(
          `  workflows → ${relative(ctx.cwd, layout.workflowsTarget)}`,
        );
      }
      if (layout.testsTarget) {
        ctx.logger.info(`  tests → ${relative(ctx.cwd, layout.testsTarget)}`);
      }

      // Rebuild the app's workflow barrels so `@workflows` re-exports the newly
      // installed module's workflows alongside the existing ones.
      if (layout.workflowsTarget) {
        generateBarrels(join(ctx.cwd, "src", "workflows"), ctx.logger);
      }

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

      // Portable aliases: make the module's own `@<id>/...` imports AND the
      // shared `@workflows` + `@workflows/*` (its relocated workflow tree) resolve
      // in the host backend's tsconfig. They are app-level — written once and
      // skipped on later installs (idempotent); generated routes import their
      // workflows from the bare `@workflows` barrel root, which resolves via the
      // non-wildcard entry both standalone and after install.
      const tsResult = registerModuleTsconfigPaths(ctx.cwd, moduleId);
      if (tsResult === "updated") {
        ctx.logger.success(`Added portable aliases to tsconfig.json`);
      } else if (tsResult === "skipped") {
        ctx.logger.warn(
          `Could not update tsconfig.json automatically — add to compilerOptions.paths:\n` +
          `  "@${moduleId}/*": ["./src/modules/${moduleId}/*"]\n` +
          `  "@workflows": ["./src/workflows"]        (app-level; add once)\n` +
          `  "@workflows/*": ["./src/workflows/*"]    (app-level; add once)`,
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

      // Link rules: seed the module's declared links into the editable draft so
      // the owner can fill targets, then run `damat module link-setup`.
      const { addedDrafts, needsTarget } = syncLinkDrafts(ctx.cwd, manifest);
      if (addedDrafts.length > 0) {
        ctx.logger.info(`Seeded link drafts: ${addedDrafts.join(", ")}`);
      }
      if (needsTarget.length > 0) {
        ctx.logger.warn(
          `These links need a target before "damat module link-setup":\n` +
            `  edit src/links/.link-drafts.json (fill to.module / to.model), then run it.\n` +
            `  pending: ${needsTarget.join(", ")}`,
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
          ...(addedDrafts.length > 0
            ? [
                `  3. fill src/links/.link-drafts.json, then: damat module link-setup`,
              ]
            : []),
        ].join("\n"),
      );

      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Failed to add module" });
      return { exitCode: 1 };
    } finally {
      resolved.cleanup();
    }
  },
};
