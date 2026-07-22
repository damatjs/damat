import { mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { linkModuleDevDependencies } from "./moduleDevFixture";

const cli = join(import.meta.dir, "../cli.ts");

function environment(): Record<string, string | undefined> {
  return {
    ...process.env,
    NO_COLOR: "1",
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ""}`,
  };
}

export async function createAndPlanFreshModule(): Promise<{
  root: string;
  moduleDir: string;
}> {
  const root = mkdtempSync("/tmp/damat-fresh-module-");
  const moduleDir = join(root, "fresh-module");
  const init = Bun.spawnSync(
    [
      process.execPath,
      cli,
      "module",
      "init",
      "fresh-module",
      "--no-install",
      "--no-database-setup",
    ],
    { cwd: root, env: environment() },
  );
  if (init.exitCode !== 0) throw new Error(init.stderr.toString());
  const plan = Bun.spawnSync(
    [process.execPath, cli, "module", "plan", moduleDir],
    { cwd: root, env: environment() },
  );
  if (plan.exitCode !== 0) throw new Error(plan.stderr.toString());
  linkModuleDevDependencies(moduleDir);
  return { root, moduleDir };
}
