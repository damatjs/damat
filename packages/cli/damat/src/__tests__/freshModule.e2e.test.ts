import { expect, test } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createAndPlanFreshModule } from "./freshModuleFixture";
import { assertPortAvailable } from "./moduleDevPort";
import { startModuleDev, type RunningModuleDev } from "./moduleDevProcess";

test("fresh module init plans, loads, and starts without PostgreSQL", async () => {
  const { root, moduleDir } = await createAndPlanFreshModule();
  let running: RunningModuleDev | undefined;
  try {
    const manifest = JSON.parse(
      readFileSync(join(moduleDir, "damat.json"), "utf8"),
    );
    expect(Object.keys(manifest.install.provides).sort()).toEqual([
      "module",
      "tests",
    ]);
    expect(manifest.module.models).toBeUndefined();
    expect(manifest.module.events).toBeUndefined();
    running = await startModuleDev(
      moduleDir,
      "postgres://invalid:invalid@127.0.0.1:1/unreachable",
    );
    const response = await fetch(`http://127.0.0.1:${running.port}/health`);
    expect(response.status).toBe(200);
    const port = running.port;
    const result = await running.stop();
    running = undefined;
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('Module "fresh-module" ready at');
    await assertPortAvailable(port);
  } finally {
    if (running) await running.stop().catch(() => undefined);
    rmSync(root, { recursive: true, force: true });
  }
}, 45_000);
