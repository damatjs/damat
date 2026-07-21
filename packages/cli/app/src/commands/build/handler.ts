import { spawn } from "bun";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext, CommandResult } from "@damatjs/cli";
import { cleanupTempFile, runTypeCheck } from "@damatjs/cli-support";
import { buildConfig } from "./buildConfig";
import { copyDir } from "./copyDir";

export async function handleBuild(ctx: CommandContext): Promise<CommandResult> {
  const outputDir = join(ctx.cwd, ctx.options.output as string);
  const target = ctx.options.target as string;
  const typecheckExit = await runTypeCheck({
    cwd: ctx.cwd,
    logger: ctx.logger,
    skip: ctx.options.typecheck === false,
    label: "app",
  });
  if (typecheckExit !== 0) return { exitCode: typecheckExit };

  const damatDir = join(ctx.cwd, ".damat");
  if (!existsSync(damatDir)) mkdirSync(damatDir, { recursive: true });
  if (existsSync(outputDir)) {
    ctx.logger.info("Cleaning old build...");
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });

  const tempEntry = join(damatDir, "build-entry.ts");
  writeFileSync(
    tempEntry,
    'import { runEntry } from "@damatjs/framework/entry";\nrunEntry();\n',
  );
  const args = [
    "bun",
    "build",
    tempEntry,
    "--outfile",
    join(outputDir, "entry.js"),
    "--target",
    target,
    "--packages",
    "external",
  ];
  if (ctx.options.minify) args.push("--minify");
  const build = spawn({
    cmd: args,
    cwd: ctx.cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await build.exited;
  cleanupTempFile(tempEntry, ctx.logger);
  const source = join(ctx.cwd, "src");
  if (exitCode !== 0 || !existsSync(source)) return { exitCode };

  ctx.logger.info("Copying source files to output directory...");
  copyDir(source, join(outputDir, "src"));
  const configExit = await buildConfig(ctx.cwd, outputDir, target, ctx.logger);
  if (configExit !== 0) {
    ctx.logger.error("Config build failed");
    return { exitCode: configExit };
  }
  ctx.logger.success("Build complete!");
  return { exitCode };
}
