import { spawn } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CliLogger } from "@damatjs/cli";

export async function buildConfig(
  cwd: string,
  outputDir: string,
  target: string,
  logger: CliLogger,
): Promise<number> {
  const configPath = join(cwd, "damat.config.ts");
  if (!existsSync(configPath)) return 0;
  logger.info("Building config file...");
  const result = spawn({
    cmd: [
      "bun",
      "build",
      configPath,
      "--outfile",
      join(outputDir, "damat.config.js"),
      "--target",
      target,
      "--external",
      "pg-cloudflare",
    ],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  return result.exited;
}
