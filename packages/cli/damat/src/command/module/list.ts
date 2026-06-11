import { join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { MODULE_MANIFEST_FILENAME } from "@damatjs/module";

export const moduleListCommand: Command = {
  name: "list",
  description: "List modules installed in this app",
  aliases: ["ls"],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory to scan",
      default: "src/modules",
    },
  ],
  handler: async (ctx) => {
    const modulesDir = join(ctx.cwd, ctx.options.dir as string);
    if (!existsSync(modulesDir)) {
      ctx.logger.info(`No modules directory at ${ctx.options.dir}`);
      return { exitCode: 0 };
    }

    const configPath = join(ctx.cwd, "damat.config.ts");
    const configContent = existsSync(configPath)
      ? readFileSync(configPath, "utf-8")
      : "";

    const entries = readdirSync(modulesDir, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory(),
    );

    if (entries.length === 0) {
      ctx.logger.info("No modules installed");
      return { exitCode: 0 };
    }

    for (const entry of entries) {
      const manifestPath = join(modulesDir, entry.name, MODULE_MANIFEST_FILENAME);
      let version = "";
      let description = "";
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
          version = manifest.version ?? "";
          description = manifest.description ?? "";
        } catch {
          description = "(invalid module.json)";
        }
      } else {
        description = "(no module.json)";
      }

      const registered = new RegExp(`["']?${entry.name}["']?\\s*:`).test(
        configContent,
      );

      ctx.logger.info(
        `${entry.name}${version ? `@${version}` : ""} ${registered ? "[registered]" : "[NOT in damat.config.ts]"}`,
        description ? { description } : undefined,
      );
    }

    return { exitCode: 0 };
  },
};
