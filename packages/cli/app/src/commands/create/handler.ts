import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext, CommandResult } from "@damatjs/cli";
import { databaseName, resolveDatabaseSelection } from "@damatjs/cli-support";
import { CLI_VERSION } from "../../version.generated";
import { createNextSteps } from "./nextSteps";
import { initializeGit, installDependencies, setupDatabase } from "./runSetup";
import { writeScaffold } from "./writeScaffold";

const APP_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export async function handleCreate(
  ctx: CommandContext,
): Promise<CommandResult> {
  const name = ctx.args[0];
  if (!name || !APP_NAME_PATTERN.test(name)) {
    ctx.logger.error("Usage: damat create <name>   (kebab-case, e.g. my-api)");
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
  const version = (ctx.options.pin as string) || CLI_VERSION;
  writeScaffold(targetDir, name, version, database.url);
  ctx.logger.success(`App created at ${targetDir}`);
  if (ctx.options.git) initializeGit(targetDir, ctx.logger);
  const installed = ctx.options.install
    ? installDependencies(targetDir, name, ctx.logger)
    : false;
  const databaseReady =
    database.setup && installed ? setupDatabase(targetDir, ctx.logger) : false;
  ctx.logger.info(
    createNextSteps(
      (ctx.options.dir as string) || name,
      installed,
      databaseReady,
    ),
  );
  if (database.setup && installed && !databaseReady) return { exitCode: 1 };
  return { exitCode: 0 };
}
