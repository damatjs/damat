import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { renamePackage } from "./renamePackage";
import { runGit } from "./runGit";

export function applyCloneExtras(
  ctx: CommandContext,
  source: string,
  targetDir: string,
  targetName: string,
): void {
  if (ctx.options.fresh) {
    rmSync(join(targetDir, ".git"), { recursive: true, force: true });
    rmSync(join(targetDir, ".github"), { recursive: true, force: true });
    const ok =
      runGit(["init", "-b", "main"], targetDir) &&
      runGit(["add", "."], targetDir) &&
      runGit(["commit", "-m", `chore: bootstrap from ${source}`], targetDir);
    if (ok) {
      ctx.logger.success("Started a fresh git history on main");
    } else {
      ctx.logger.warn(
        "Could not initialize the fresh git history — run `git init` yourself",
      );
    }
  }
  if (ctx.options.name) {
    const renamed = renamePackage(targetDir, ctx.options.name as string);
    if (renamed) {
      ctx.logger.success(`Renamed package.json to "${ctx.options.name}"`);
    } else {
      ctx.logger.warn("No readable package.json to rename");
    }
  }
  if (ctx.options.install) {
    ctx.logger.info("Installing dependencies (bun install)...");
    const result = spawnSync("bun", ["install"], {
      cwd: targetDir,
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (result.status === 0) {
      ctx.logger.success("Dependencies installed");
    } else {
      ctx.logger.warn(`bun install failed — run it manually in ${targetName}/`);
    }
  }
}
