import { join, basename } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { KIT_MANIFEST_FILENAME } from "./manifest";

const KIT_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const kitInitCommand: Command = {
  name: "init",
  description: "Describe THIS codebase as a shareable kit (writes damat-kit.json)",
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

    const manifestPath = join(ctx.cwd, KIT_MANIFEST_FILENAME);
    if (existsSync(manifestPath)) {
      ctx.logger.error(`${KIT_MANIFEST_FILENAME} already exists`);
      return { exitCode: 1 };
    }

    // A working starter: everything ships to a namespaced fallback until the
    // author writes real mappings — installs are predictable from day one.
    const starter = {
      name,
      description: "",
      version: "0.1.0",
      mappings: [
        { from: "src/**", to: `src/${name}` },
      ],
      fallback: `shared/${name}`,
      ignore: ["**/*.test.*", "tests/**", "README.md", ".gitignore"],
      packages: {},
      notes: "",
    };
    writeFileSync(manifestPath, `${JSON.stringify(starter, null, 2)}\n`);

    ctx.logger.success(`Wrote ${KIT_MANIFEST_FILENAME}`);
    ctx.logger.info(
      [
        "Shape the manifest to your codebase:",
        '  - mappings: [{ from: "<glob over this repo>", to: "<dir in the RECEIVING project>" }] — first match wins',
        "  - fallback: where files matched by no mapping go (omit to skip them with a warning)",
        "  - packages: npm deps the kit needs in the target",
        "",
        "Preview an install any time with:",
        "  damat kit validate            # from this repo",
        "  damat kit add <this-repo> --dry-run   # from a consuming project",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};
