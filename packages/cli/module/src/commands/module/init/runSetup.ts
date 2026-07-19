import { spawnSync } from "node:child_process";
import type { CliLogger } from "@damatjs/cli";

function run(target: string, args: string[]): boolean {
  try {
    return (
      spawnSync("bun", args, { cwd: target, stdio: "inherit" }).status === 0
    );
  } catch {
    return false;
  }
}

export function installModuleDependencies(
  target: string,
  logger: CliLogger,
): boolean {
  logger.info("Installing module dependencies...");
  if (run(target, ["install"])) {
    logger.success("Module dependencies installed");
    return true;
  }
  logger.warn("bun install failed — run it manually before module development");
  return false;
}

export function setupModuleDatabase(
  target: string,
  logger: CliLogger,
): boolean {
  logger.info("Creating the module development database...");
  if (run(target, ["run", "database:setup"])) {
    logger.success("Module database is ready");
    return true;
  }
  logger.error(
    "Module database setup failed — verify PostgreSQL, then run `bun run database:setup`",
  );
  return false;
}
