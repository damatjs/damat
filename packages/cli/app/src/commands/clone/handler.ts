import { basename, join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import type { CommandContext, CommandResult } from "@damatjs/cli";
import { reportError } from "@damatjs/cli";
import { requireGit } from "@damatjs/cli-support";
import { applyCloneExtras } from "./applyExtras";
import { cloneTarget } from "./cloneTarget";
import { parseCloneSource } from "./parseCloneSource";
import { repoBasename } from "./repoBasename";

export async function handleClone(ctx: CommandContext): Promise<CommandResult> {
  const source = ctx.args[0];
  if (!source) {
    ctx.logger.error("Usage: damat clone <source> [dir]");
    return { exitCode: 1 };
  }
  const gitError = requireGit("clone repositories");
  if (gitError) {
    ctx.logger.error(gitError);
    return { exitCode: 1 };
  }
  let parsed;
  try {
    parsed = parseCloneSource(source);
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Could not parse clone source" });
    return { exitCode: 1 };
  }
  const ref = (ctx.options.branch as string) || parsed.ref;
  const targetName =
    ctx.args[1] ||
    (parsed.subDir ? basename(parsed.subDir) : repoBasename(parsed.repoUrl));
  const targetDir = join(ctx.cwd, targetName);
  if (existsSync(targetDir)) {
    ctx.logger.error(`${targetDir} already exists`);
    return { exitCode: 1 };
  }
  try {
    cloneTarget(
      parsed,
      targetDir,
      targetName,
      ref,
      ctx.options.depth as number | undefined,
      Boolean(ctx.options.fresh),
      ctx.cwd,
      ctx.logger,
    );
    applyCloneExtras(ctx, source, targetDir, targetName);
    return { exitCode: 0 };
  } catch (error) {
    rmSync(targetDir, { recursive: true, force: true });
    reportError(ctx.logger, error, { prefix: "Clone failed" });
    return { exitCode: 1 };
  }
}
