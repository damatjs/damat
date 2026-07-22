import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  createContext,
  describe,
  expect,
  fsState,
  it,
  mm,
  mock,
  mockMkdirSync,
  setSpawnHandler,
  spawnCalls,
  writeCalls,
} from "./context";
import { getModuleDevCommand } from "./devContext";

describe("module dev preflight and signals", () => {
  it("fails a port collision before creating files or a watcher", async () => {
    const { ModulePortInUseError } = await import("@damatjs/module");
    mm.portError = new ModulePortInUseError(7662);
    const { ctx, logger } = createContext({ port: 7662 }, { cwd: "/m" });
    const result = await (await getModuleDevCommand()).handler(ctx);
    expect(result.exitCode).toBe(1);
    expect(mm.calls).toEqual(["runtime-plan", "port-check"]);
    expect(logger.error.mock.calls.map(([message]) => message)).toEqual([
      "Port 7662 is already in use.",
      "Use: damat module dev --port <port>",
    ]);
    expect(mockMkdirSync).not.toHaveBeenCalled();
    expect(writeCalls).toEqual([]);
    expect(spawnCalls).toEqual([]);
  });

  it("reports non-port preflight failures before creating files", async () => {
    mm.databaseError = new Error("DATABASE_URL is not set");
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const result = await (await getModuleDevCommand()).handler(ctx);
    expect(result.exitCode).toBe(1);
    expect(logger.error.mock.calls[0]?.[0]).toContain(
      "Module development preflight failed",
    );
    expect(writeCalls).toEqual([]);
  });

  it("forwards SIGINT to the watcher and removes the handler", async () => {
    fsState.existsDefault = false;
    let finish!: (code: number) => void;
    const exited = new Promise<number>((resolve) => void (finish = resolve));
    const kill = mock(() => {});
    setSpawnHandler((options) => {
      spawnCalls.push(options);
      return { exited, kill };
    });
    const beforeInterrupt = new Set(process.listeners("SIGINT"));
    const beforeTerminate = new Set(process.listeners("SIGTERM"));
    const { ctx } = createContext({}, { cwd: "/m" });
    const pending = (await getModuleDevCommand()).handler(ctx);
    await Bun.sleep(0);
    const listener = process
      .listeners("SIGINT")
      .find((item) => !beforeInterrupt.has(item));
    const terminate = process
      .listeners("SIGTERM")
      .find((item) => !beforeTerminate.has(item));
    expect(listener).toBeDefined();
    listener!();
    terminate!();
    expect(kill).toHaveBeenCalledWith("SIGINT");
    expect(kill).toHaveBeenCalledWith("SIGTERM");
    finish(0);
    expect((await pending).exitCode).toBe(0);
    expect(process.listeners("SIGINT")).not.toContain(listener!);
  });
});
