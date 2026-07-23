import { expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { copyModuleDevFixture } from "./moduleDevFixture";
import { assertPortAvailable } from "./moduleDevPort";
import {
  startPtyModuleDev,
  type RunningPtyModuleDev,
} from "./moduleDevPty";
import { activeWorkerIds, stoppedWorkers } from "./moduleDevWorkers";

test("interactive Ctrl-C drains workers and releases the port", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("The module dev PTY regression requires DATABASE_URL");
  const cwd = copyModuleDevFixture();
  const before = new Set(await activeWorkerIds(databaseUrl));
  let running: RunningPtyModuleDev | undefined;
  try {
    running = await startPtyModuleDev(cwd, databaseUrl);
    const ids = (await activeWorkerIds(databaseUrl)).filter(
      (id) => !before.has(id),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(await fetch(`http://127.0.0.1:${running.port}/health`)).toMatchObject(
      { status: 200 },
    );
    expect(await running.interrupt(), running.output()).toBe(0);
    const port = running.port;
    running = undefined;
    const rows = await stoppedWorkers(databaseUrl, ids);
    expect(rows).toHaveLength(ids.length);
    expect(rows.every((row) => row.stopping_at && row.stopped_at)).toBe(true);
    await assertPortAvailable(port);
  } finally {
    if (running) await running.interrupt().catch(() => undefined);
    rmSync(cwd, { recursive: true, force: true });
  }
}, 60_000);
