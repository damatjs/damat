import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "@damatjs/cli";
import { MODULE_MANIFEST_FILENAME } from "@damatjs/module";
import { readModuleMeta } from "./readModuleMeta";
import { readProvenance } from "./provenance";

export const handleModuleList: Command["handler"] = async (ctx) => {
  const modulesDir = join(ctx.cwd, ctx.options.dir as string);
  if (!existsSync(modulesDir)) {
    ctx.logger.info(`No modules directory at ${ctx.options.dir}`);
    return { exitCode: 0 };
  }
  const configPath = join(ctx.cwd, "damat.config.ts");
  const config = existsSync(configPath)
    ? readFileSync(configPath, "utf-8")
    : "";
  const entries = readdirSync(modulesDir, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  );
  if (!entries.length) {
    ctx.logger.info("No modules installed");
    return { exitCode: 0 };
  }
  for (const entry of entries) {
    const meta = readModuleMeta(
      join(modulesDir, entry.name, MODULE_MANIFEST_FILENAME),
    );
    const registered = new RegExp(`["']?${entry.name}["']?\\s*:`).test(config);
    const provenance = readProvenance(config, entry.name);
    const details: Record<string, unknown> = {};
    if (meta.description) details.description = meta.description;
    if (provenance.type) details.from = provenance.type;
    if (provenance.owner) details.owner = provenance.owner;
    if (provenance.verification) details.verification = provenance.verification;
    ctx.logger.info(
      `${entry.name}${meta.version ? `@${meta.version}` : ""} ${registered ? "[registered]" : "[NOT in damat.config.ts]"}`,
      Object.keys(details).length ? details : undefined,
    );
  }
  return { exitCode: 0 };
};
