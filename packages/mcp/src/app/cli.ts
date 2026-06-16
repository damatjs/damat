import { spawnSync } from "node:child_process";

import { appDir, damatCli } from "../env";

/** Run the damat CLI in the app dir and capture combined stdout/stderr. */
export function runDamat(args: string[]): { ok: boolean; output: string } {
  const [cmd, ...prefix] = damatCli();
  const result = spawnSync(cmd, [...prefix, ...args], {
    cwd: appDir(),
    encoding: "utf-8",
    env: process.env,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.error) {
    return {
      ok: false,
      output:
        `Failed to run "${[cmd, ...prefix].join(" ")}": ${result.error.message}\n` +
        `Set DAMAT_CLI if the damat binary is not on PATH ` +
        `(e.g. "bun /path/to/packages/cli/damat/src/cli.ts").`,
    };
  }
  return { ok: result.status === 0, output };
}
