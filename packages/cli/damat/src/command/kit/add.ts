import { join, resolve, sep } from "node:path";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { type Command, reportError } from "@damatjs/cli";
import { readKitManifest } from "./manifest";
import { buildKitPlan, type PlannedFile } from "./plan";
import { resolveKitSource } from "./source";
import { invalidPackageSpecs, installModulePackages } from "../module/helpers";

/** Where installed kits are recorded in the target project (committable). */
export const KIT_RECORD_FILENAME = "damat-kits.json";

export const kitAddCommand: Command = {
  name: "add",
  description:
    "Copy a shared kit (any codebase with a damat-kit.json) into this project",
  usage:
    "damat kit add <source> [--force] [--dry-run] [--no-install] [--allow-scripts]",
  examples: [
    "damat kit add acme/design-kit                    # github shorthand",
    "damat kit add acme/mono/kits/auth#main --dry-run # subdirectory + ref, plan only",
    "damat kit add ../shared-kits/emails              # local path",
  ],
  options: [
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description:
        "Overwrite files that already exist in the target (default: skip them)",
      default: false,
    },
    {
      name: "dry-run",
      type: "boolean",
      description: "Print where every file would go without writing anything",
      default: false,
    },
    {
      name: "install",
      type: "boolean",
      description:
        "Install the kit's npm packages via bun add (use --no-install to skip)",
      default: true,
    },
    {
      name: "allow-scripts",
      type: "boolean",
      description:
        "Run dependency lifecycle scripts during bun add (skipped by default)",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const source = ctx.args[0];
    if (!source) {
      ctx.logger.error("Usage: damat kit add <source>");
      return { exitCode: 1 };
    }

    let resolved;
    try {
      resolved = resolveKitSource(source, ctx.cwd);
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not resolve kit source" });
      return { exitCode: 1 };
    }

    try {
      const manifest = readKitManifest(resolved.dir);
      const plan = buildKitPlan(resolved.dir, manifest);

      ctx.logger.info(`Kit "${manifest.name}"`, {
        ...(manifest.version ? { version: manifest.version } : {}),
        ...(manifest.description ? { description: manifest.description } : {}),
        files: plan.files.length,
      });

      // Validate npm specs BEFORE any file is written — a hostile dependency
      // list aborts the whole install (same gate as `module add`).
      const packages = manifest.packages ?? {};
      const badSpecs = invalidPackageSpecs(packages);
      if (badSpecs.length > 0) {
        ctx.logger.error(
          `Refusing to add "${manifest.name}" — unsafe package specs:\n  ` +
            badSpecs.join("\n  "),
        );
        return { exitCode: 1 };
      }

      if (plan.unmatched.length > 0) {
        ctx.logger.warn(
          [
            `${plan.unmatched.length} file(s) matched no mapping and the kit declares no \`fallback\` — skipped:`,
            ...plan.unmatched.map((f) => `  - ${f}`),
          ].join("\n"),
        );
      }

      if (ctx.options["dry-run"]) {
        ctx.logger.info(
          [
            `Dry run — adding "${manifest.name}" would write:`,
            ...plan.files.map(
              (f) =>
                `  ${f.source} -> ${f.target}${f.via === "fallback" ? "  (fallback)" : ""}`,
            ),
            ...(Object.keys(packages).length > 0
              ? [`  + bun add ${Object.keys(packages).join(" ")}`]
              : []),
          ].join("\n"),
        );
        return { exitCode: 0 };
      }

      const { written, skipped } = copyPlanned(
        resolved.dir,
        ctx.cwd,
        plan.files,
        {
          force: Boolean(ctx.options.force),
        },
      );
      ctx.logger.success(
        `Installed ${written.length} file(s) from "${manifest.name}"`,
      );
      if (skipped.length > 0) {
        ctx.logger.warn(
          `${skipped.length} file(s) already existed and were kept — re-run with --force to overwrite:\n  ` +
            skipped.map((f) => f.target).join("\n  "),
        );
      }

      recordInstalledKit(ctx.cwd, {
        name: manifest.name,
        ...(manifest.version ? { version: manifest.version } : {}),
        source: resolved.origin.ref,
        sourceType: resolved.origin.type,
        installedAt: new Date().toISOString(),
        files: plan.files.map((f) => f.target),
      });
      ctx.logger.info(`Recorded the kit in ${KIT_RECORD_FILENAME}`);

      if (ctx.options.install && Object.keys(packages).length > 0) {
        ctx.logger.info(
          `Installing packages: ${Object.keys(packages).join(", ")}`,
        );
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

      if (manifest.notes) {
        ctx.logger.info(`Notes from "${manifest.name}":\n${manifest.notes}`);
      }
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Failed to add kit" });
      return { exitCode: 1 };
    } finally {
      resolved.cleanup();
    }
  },
};

/** Copy the planned files; existing targets are kept unless `force`. */
function copyPlanned(
  kitDir: string,
  projectRoot: string,
  files: PlannedFile[],
  options: { force: boolean },
): { written: PlannedFile[]; skipped: PlannedFile[] } {
  const written: PlannedFile[] = [];
  const skipped: PlannedFile[] = [];
  const root = resolve(projectRoot);
  for (const file of files) {
    // Defense in depth behind the manifest's lexical validation: even a
    // bypass of targetPathError must not write outside the project root.
    const targetAbs = resolve(root, file.target);
    if (targetAbs !== root && !targetAbs.startsWith(root + sep)) {
      throw new Error(
        `Refusing to write outside the project root: ${file.target}`,
      );
    }
    if (existsSync(targetAbs) && !options.force) {
      skipped.push(file);
      continue;
    }
    mkdirSync(join(targetAbs, ".."), { recursive: true });
    cpSync(join(kitDir, file.source), targetAbs);
    written.push(file);
  }
  return { written, skipped };
}

interface InstalledKitRecord {
  name: string;
  version?: string;
  source: string;
  sourceType: "path" | "git";
  installedAt: string;
  files: string[];
}

/** Upsert the kit's entry in damat-kits.json (created on first install). */
function recordInstalledKit(
  projectRoot: string,
  record: InstalledKitRecord,
): void {
  const recordPath = join(projectRoot, KIT_RECORD_FILENAME);
  let kits: InstalledKitRecord[] = [];
  if (existsSync(recordPath)) {
    try {
      const parsed = JSON.parse(readFileSync(recordPath, "utf-8")) as {
        kits?: InstalledKitRecord[];
      };
      if (Array.isArray(parsed.kits)) kits = parsed.kits;
    } catch {
      // Unreadable record — start fresh rather than fail the install.
    }
  }
  kits = [...kits.filter((k) => k.name !== record.name), record];
  writeFileSync(recordPath, `${JSON.stringify({ kits }, null, 2)}\n`);
}
