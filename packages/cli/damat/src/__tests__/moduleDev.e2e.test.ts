import { expect, test } from "bun:test";
import { appendFileSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { runCollidingModuleDev } from "./moduleDevCollision";
import { copyModuleDevFixture } from "./moduleDevFixture";
import { assertPortAvailable } from "./moduleDevPort";
import {
  activeWorkerCount,
  exerciseModuleDev,
  migrationCheckCount,
} from "./moduleDevRequests";
import { startModuleDev, type RunningModuleDev } from "./moduleDevProcess";

test("generated module dev survives reload and owns its process lifecycle", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("The module dev CLI regression requires DATABASE_URL");
  const cwd = copyModuleDevFixture();
  let running: RunningModuleDev | undefined;
  try {
    const packageJson = JSON.parse(
      readFileSync(join(cwd, "package.json"), "utf8"),
    );
    expect(packageJson.scripts.dev).toBe("damat module dev");
    running = await startModuleDev(cwd, databaseUrl);
    const firstPort = running.port;
    const firstUrl = `http://127.0.0.1:${firstPort}`;
    expect(firstPort).toBeGreaterThan(0);
    expect(await exerciseModuleDev(firstUrl)).toMatchObject({
      health: 200,
      record: 201,
      durable: { job: "succeeded", pipeline: "succeeded" },
    });
    const workers = await activeWorkerCount(firstUrl);
    expect(workers).toBeGreaterThan(0);
    expect(migrationCheckCount(running.output())).toBe(1);
    const entry = join(cwd, ".damat/module-dev-entry.ts");
    appendFileSync(join(cwd, "src/providers/jobs.ts"), "\n");
    const port = await running.waitForReadiness(2);
    const url = `http://127.0.0.1:${port}`;
    expect(await exerciseModuleDev(url)).toMatchObject({
      health: 200,
      record: 201,
      durable: {
        job: "succeeded",
        pipeline: "succeeded",
        events: [
          { consumer: "fixture.audit", status: "succeeded" },
          { consumer: "fixture.notify", status: "succeeded" },
        ],
      },
    });
    expect(await activeWorkerCount(url)).toBe(workers);
    if (port !== firstPort) await assertPortAvailable(firstPort);
    const writtenAt = statSync(entry).mtimeMs;
    const collision = await runCollidingModuleDev(cwd, databaseUrl, port);
    const collisionOutput = `${collision.stdout}${collision.stderr}`;
    expect(collision.code).not.toBe(0);
    expect(collisionOutput).toContain(`Port ${port} is already in use.`);
    expect(collisionOutput).not.toContain("ready at");
    expect(migrationCheckCount(collisionOutput)).toBe(0);
    expect(statSync(entry).mtimeMs).toBe(writtenAt);
    const result = await running.stop();
    running = undefined;
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      `✓ Module "standalone-durable-fixture" ready at http://localhost:${firstPort}`,
    );
    expect(result.stdout).toContain(
      `Routes mounted under http://localhost:${firstPort}/api`,
    );
    expect(result.stdout.match(/Press Ctrl-C to stop/g)).toHaveLength(2);
    expect(migrationCheckCount(result.stdout)).toBe(2);
    await assertPortAvailable(port);
  } finally {
    if (running) await running.stop().catch(() => undefined);
    rmSync(cwd, { recursive: true, force: true });
  }
}, 60_000);
