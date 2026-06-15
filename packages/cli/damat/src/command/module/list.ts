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

      const provenance = readProvenance(configContent, entry.name);
      const meta: Record<string, unknown> = {};
      if (description) meta.description = description;
      if (provenance.type) meta.from = provenance.type;
      if (provenance.owner) meta.owner = provenance.owner;
      if (provenance.verification) meta.verification = provenance.verification;

      ctx.logger.info(
        `${entry.name}${version ? `@${version}` : ""} ${registered ? "[registered]" : "[NOT in damat.config.ts]"}`,
        Object.keys(meta).length > 0 ? meta : undefined,
      );
    }

    return { exitCode: 0 };
  },
};

/**
 * Best-effort read of a module's recorded provenance from damat.config.ts.
 * Scoped to the module's own entry (entries close with a 4-space `},`), so it
 * never bleeds into a sibling. Returns empty when nothing matches.
 */
function readProvenance(
  config: string,
  name: string,
): { type?: string; owner?: string; verification?: string } {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyMatch = new RegExp(
    `(?:^|[\\s{,])["']?${escaped}["']?\\s*:\\s*\\{`,
  ).exec(config);
  if (!keyMatch) return {};

  const rest = config.slice(keyMatch.index + keyMatch[0].length);
  const entryEnd = rest.indexOf("\n    },");
  const entryBody = entryEnd === -1 ? rest : rest.slice(0, entryEnd);

  const body = /source\s*:\s*\{([\s\S]*?)\}/.exec(entryBody)?.[1];
  if (!body) return {};

  const field = (key: string): string | undefined =>
    new RegExp(`${key}\\s*:\\s*["']([^"']*)["']`).exec(body)?.[1];

  const result: { type?: string; owner?: string; verification?: string } = {};
  const type = field("type");
  const owner = field("owner");
  const verification = field("verification");
  if (type) result.type = type;
  if (owner) result.owner = owner;
  if (verification) result.verification = verification;
  return result;
}
