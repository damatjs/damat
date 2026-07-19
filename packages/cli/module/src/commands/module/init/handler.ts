import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "@damatjs/cli";
import {
  databaseName,
  databaseOption,
  resolveDatabaseSelection,
} from "@damatjs/cli-support";
import { scaffoldModule } from "./scaffold";
import { installModuleDependencies, setupModuleDatabase } from "./runSetup";

const MODULE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const handleModuleInit: Command["handler"] = async (ctx) => {
  const name = ctx.args[0];
  if (!name || !MODULE_NAME_PATTERN.test(name)) {
    ctx.logger.error(
      "Usage: damat module init <name>   (kebab-case, e.g. user-management)",
    );
    return { exitCode: 1 };
  }
  const targetDir = join(ctx.cwd, (ctx.options.dir as string) || name);
  if (existsSync(targetDir)) {
    ctx.logger.error(`${targetDir} already exists`);
    return { exitCode: 1 };
  }
  let database;
  try {
    database = await resolveDatabaseSelection(ctx.options, databaseName(name));
  } catch (error) {
    ctx.logger.error(String(error).replace(/^Error: /, ""));
    return { exitCode: 1 };
  }
  scaffoldModule(targetDir, name, database.url);
  ctx.logger.success(`Module package created at ${targetDir}`);
  const shouldInstall = databaseOption(ctx.options, "install") === true;
  const installed = shouldInstall
    ? installModuleDependencies(targetDir, ctx.logger)
    : false;
  const databaseReady =
    database.setup && installed
      ? setupModuleDatabase(targetDir, ctx.logger)
      : false;
  ctx.logger.info(
    [
      "Wrote README.md + AGENTS.md (read AGENTS.md — it's the full authoring guide).",
      "",
      "Next steps:",
      `  cd ${(ctx.options.dir as string) || name}`,
      ...(installed ? [] : ["  bun install"]),
      ...(databaseReady ? [] : ["  bun run database:setup"]),
      "  # add models in src/models, service logic in src/service.ts",
      "  bun run migration:create   # generate the schema migration",
      "  bun run codegen            # generate row types + zod schemas",
      "  bun run dev                # run the module standalone",
      "  bun test                   # contract + service + api tests",
    ].join("\n"),
  );
  if (database.setup && installed && !databaseReady) return { exitCode: 1 };
  return { exitCode: 0 };
};
