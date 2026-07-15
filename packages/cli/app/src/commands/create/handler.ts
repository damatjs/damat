import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext, CommandResult } from "@damatjs/cli";
import { CLI_VERSION } from "../../version.generated";
import { createNextSteps } from "./nextSteps";
import { initializeGit, installDependencies } from "./runSetup";
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
  const version = (ctx.options.pin as string) || CLI_VERSION;
  writeScaffold(targetDir, name, version);
  ctx.logger.success(`App created at ${targetDir}`);
  if (ctx.options.git) initializeGit(targetDir, ctx.logger);
  if (ctx.options.install) {
    installDependencies(targetDir, name, ctx.logger);
  }
  ctx.logger.info(createNextSteps(name, Boolean(ctx.options.install)));
  return { exitCode: 0 };
}
