import { describe, expect, test } from "bun:test";
import {
  MODULE_DEV_CHILD_STOPPING_MESSAGE,
  spawnModuleDevChild,
} from "../commands/module/devWatcherChild";
import { watcherFixture } from "./devWatcherFixture";

describe("module development watcher", () => {
  test("restarts only after graceful child shutdown", async () => {
    const fixture = watcherFixture();
    const watcher = fixture.start();
    fixture.notify(".damat\\entry.ts");
    fixture.notify(null);
    fixture.notify("src/jobs.ts");
    await Bun.sleep(60);
    expect(fixture.children[0]!.kill).toHaveBeenCalledWith("SIGTERM");
    fixture.notify("src/events.ts");
    await Bun.sleep(60);
    fixture.children[0]!.finish(0);
    await Bun.sleep(0);
    expect(fixture.children).toHaveLength(2);
    watcher.kill("SIGINT");
    await Bun.sleep(110);
    expect(fixture.children[1]!.kill).toHaveBeenCalledWith("SIGINT");
    fixture.children[1]!.finish(0);
    expect(await watcher.exited).toBe(0);
    watcher.kill();
    expect(fixture.close).toHaveBeenCalled();
  });

  test("returns unexpected child exits", async () => {
    const fixture = watcherFixture();
    const watcher = fixture.start();
    fixture.children[0]!.finish(7);
    expect(await watcher.exited).toBe(7);
    watcher.kill();
  });

  test("does not duplicate a foreground-process-group signal", async () => {
    const fixture = watcherFixture();
    const watcher = fixture.start();
    watcher.kill("SIGINT");
    fixture.children[0]!.acknowledge();
    await Bun.sleep(110);
    expect(fixture.children[0]!.kill).not.toHaveBeenCalled();
    fixture.children[0]!.finish(0);
    expect(await watcher.exited).toBe(0);
  });

  test("closes when initial launch fails", () => {
    const fixture = watcherFixture(1);
    expect(fixture.start).toThrow("launch failed");
    expect(fixture.close).toHaveBeenCalledTimes(1);
  });

  test("reports restart launch failures", async () => {
    const fixture = watcherFixture(2);
    const watcher = fixture.start();
    fixture.notify("src/pipelines.ts");
    await Bun.sleep(60);
    fixture.children[0]!.finish(0);
    expect(await watcher.exited).toBe(1);
    expect(fixture.error).toHaveBeenCalledWith(
      "Failed to restart module:",
      expect.any(Error),
    );
  });

  test("spawns a Bun child with shutdown acknowledgement", async () => {
    const calls: unknown[] = [];
    const run = (options: unknown) => {
      calls.push(options);
      return {} as never;
    };
    const child = spawnModuleDevChild(
      { cwd: "/m", entryFile: "/m/entry.ts" },
      run as never,
    );
    spawnModuleDevChild(
      { cwd: "/m", entryFile: "/m/entry.ts", port: 0 },
      run as never,
    );
    expect(calls).toHaveLength(2);
    expect(child.shutdownStarted).toBeInstanceOf(Promise);
    expect(calls[0]).not.toHaveProperty("env.PORT");
    expect(calls[0]).toHaveProperty("ipc", expect.any(Function));
    expect(calls[1]).toHaveProperty("env.PORT", "0");
    const ipc = (calls[0] as { ipc: (message: unknown) => void }).ipc;
    ipc(MODULE_DEV_CHILD_STOPPING_MESSAGE);
    await expect(child.shutdownStarted).resolves.toBeUndefined();
  });
});
