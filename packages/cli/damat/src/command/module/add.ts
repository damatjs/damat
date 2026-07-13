import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";

import {
  readModuleManifest,
  locateModuleDir,
  evaluateVerification,
  validateModuleDir,
} from "@damatjs/module";
import type { ModuleSource } from "@damatjs/framework";
import {
  resolveModuleSource,
  installModuleSplit,
  moduleLayoutPaths,
  registerModuleInConfig,
  registerModuleTsconfigPaths,
  ensureLinksInConfig,
  syncEnvVars,
  installModulePackages,
  collectModulePackages,
  invalidPackageSpecs,
  moduleIdError,
  modulesDirError,
  unverifiedSourceError,
} from "./helpers";

export const moduleAddCommand: Command = {
  name: "add",
  description: "Add a module to this app from the registry, a path, or git (shadcn-style)",
  usage:
    "damat module add <source> [--name <id>] [--dir <path>] [--force] [--allow-unverified] [--allow-scripts] [--dry-run]",
  examples: [
    "damat module add user-management            # registry ref (DAMAT_MODULE_REGISTRY)",
    "damat module add damatjs/user-management@0.0.1",
    "damat module add ./local/path/to/module-package --allow-unverified",
    "damat module add https://github.com/damatjs/modules.git#main --allow-unverified",
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
    {
      name: "allow-unverified",
      type: "boolean",
      description:
        "Install from a path/git source (no registry verification) and permit file:/git/url dependency ranges",
      default: false,
    },
    {
      name: "allow-scripts",
      type: "boolean",
      description:
        "Run dependency lifecycle scripts during bun add (skipped by default)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Resolve and validate the module, then print what would be installed without writing anything",
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
      const allowUnverified = Boolean(ctx.options["allow-unverified"]);

      // The id and target dir become filesystem paths — refuse anything that
      // could traverse outside the app before a single byte is written.
      const guardError = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
      if (guardError) {
        ctx.logger.error(guardError);
        return { exitCode: 1 };
      }

      const targetDir = join(ctx.cwd, modulesDir, moduleId);
      const relativeTarget = `./${join(modulesDir, moduleId)}`;

      ctx.logger.info(`Adding module "${moduleId}"`, {
        version: manifest.version,
        description: manifest.description,
      });

      // Provenance + verification gate. Registry installs carry a verifiable
      // owner and a verification status the registry stamped; path/git sources
      // carry none, so they need the explicit --allow-unverified opt-in and
      // must at least pass the local structural validation.
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
        const trustError = unverifiedSourceError(
          resolved.origin.type,
          allowUnverified,
        );
        if (trustError) {
          ctx.logger.error(`Refusing to install "${moduleId}": ${trustError}`);
          return { exitCode: 1 };
        }
        const report = validateModuleDir(sourceModuleDir);
        if (!report.valid) {
          for (const error of report.errors) ctx.logger.error(error);
          ctx.logger.error(
            `Refusing to install "${moduleId}": module failed validation`,
          );
          return { exitCode: 1 };
        }
      }

      // npm packages the module needs (its own deps + manifest overrides).
      // Validate the specs before any file is written so a malicious
      // dependency list aborts the whole install.
      const packages = collectModulePackages(resolved.dir, manifest);
      const badSpecs = invalidPackageSpecs(packages, {
        allowUnsafeRanges: allowUnverified,
      });
      if (badSpecs.length > 0) {
        ctx.logger.error(
          `Refusing to install "${moduleId}" — unsafe package specs:\n  ` +
            badSpecs.join("\n  "),
        );
        return { exitCode: 1 };
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

      // Everything is resolved and validated but nothing has been written yet —
      // this is the dry-run boundary.
      if (ctx.options["dry-run"]) {
        const layout = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir);
        const plannedActions = [
          `install module files to ${relative(ctx.cwd, layout.moduleHome)}/`,
          ...(existsSync(join(sourceModuleDir, "api", "routes"))
            ? [`install routes to ${relative(ctx.cwd, layout.apiTarget)}/`]
            : []),
          ...(existsSync(join(sourceModuleDir, "workflows"))
            ? [`install workflows to ${relative(ctx.cwd, layout.workflowsTarget)}/ and rebuild barrels`]
            : []),
          ...(existsSync(join(sourceModuleDir, "links"))
            ? [`install links to ${relative(ctx.cwd, layout.linksTarget)}/`]
            : []),
          `register "${moduleId}" in damat.config.ts (resolve: "${relativeTarget}")`,
          `ensure "@${moduleId}/*" + "@workflows" aliases in tsconfig.json`,
          ...((manifest.env ?? []).length > 0
            ? [`sync env vars into .env.example: ${(manifest.env ?? []).map((v) => v.name).join(", ")}`]
            : []),
          ...(Object.keys(packages).length > 0
            ? [`bun add ${Object.keys(packages).join(" ")}`]
            : []),
        ];
        ctx.logger.info(
          [`Dry run — adding "${moduleId}" would:`, ...plannedActions.map((a) => `  - ${a}`)].join("\n"),
        );
        return { exitCode: 0 };
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
      if (layout.linksTarget) {
        ctx.logger.info(`  links → ${relative(ctx.cwd, layout.linksTarget)}`);
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

      // Links: the module shipped real defineLink files (now under
      // src/links/<moduleId>/). Make sure the app boots/migrates/typegens the
      // links tree by ensuring `links: "./src/links"` in the config.
      if (layout.linksTarget) {
        if (ensureLinksInConfig(configPath)) {
          ctx.logger.success(`Ensured links: "./src/links" in damat.config.ts`);
        } else {
          ctx.logger.warn(
            `Add \`links: "./src/links"\` to your damat.config.ts (could not edit it automatically)`,
          );
        }
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

      // npm packages (validated above, before any file was written).
      // Lifecycle scripts stay off unless --allow-scripts was passed.
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
          `  1. bun damat-orm migrate:up    # apply the module's migrations`,
          `  2. restart the dev server      # the module self-registers via damat.config.ts`,
          ...(layout.linksTarget
            ? [
                `  3. bun damat-orm migrate:create link:${moduleId}   # generate the link junction migration`,
                `  4. bun damat-orm migrate:up                        # create the junction table(s)`,
                `  5. damat codegen ${moduleId}                       # regenerate types incl. link fields`,
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
