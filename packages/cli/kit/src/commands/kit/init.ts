import { join, basename } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { DAMAT_MANIFEST_FILENAME } from "@damatjs/installer";

const KIT_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const kitInitCommand: Command = {
  name: "init",
  description: "Describe this codebase as a shareable kit (writes damat.json)",
  usage: "damat kit init [name]",
  examples: ["damat kit init", "damat kit init design-system"],
  options: [],
  handler: async (ctx) => {
    const name = ctx.args[0] || basename(ctx.cwd);
    if (!KIT_NAME_PATTERN.test(name)) {
      ctx.logger.error(
        `Kit name "${name}" must be kebab-case — pass one explicitly: damat kit init <name>`,
      );
      return { exitCode: 1 };
    }

    const manifestPath = join(ctx.cwd, DAMAT_MANIFEST_FILENAME);
    if (existsSync(manifestPath)) {
      ctx.logger.error(`${DAMAT_MANIFEST_FILENAME} already exists`);
      return { exitCode: 1 };
    }

    // A working starter: everything ships to a namespaced fallback until the
    // author writes real mappings — installs are predictable from day one.
    const starter = {
      $schema: "https://damat.dev/schemas/damat-v1.json",
      schemaVersion: 1,
      kind: "kit",
      name,
      version: "0.1.0",
      install: {
        modes: ["source", "package"],
        default: "source",
        packageBackends: ["node", "damat"],
        provides: { files: { from: "src/**", fallbackTo: "src/{id}" } },
        ignore: ["**/*.test.*", "tests/**", "README.md", ".gitignore"],
      },
    };
    writeFileSync(manifestPath, `${JSON.stringify(starter, null, 2)}\n`);

    ctx.logger.success(`Wrote ${DAMAT_MANIFEST_FILENAME}`);
    ctx.logger.info(
      [
        "Shape the manifest to your codebase:",
        "  - install.provides: capabilities and source globs",
        "  - fallbackTo: safe destination when a receiver has no matching accept",
        "  - install.packages: runtime dependencies for Node package mode",
        "",
        "Preview an install any time with:",
        "  damat kit validate            # from this repo",
        "  damat kit plan <this-repo>     # from a consuming project",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};
