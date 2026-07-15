import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  writeCalls,
  unlinkCalls,
  spawnCalls,
  loadEnvCalls,
  mockMkdirSync,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module dev command", () => {
  const get = async () =>
    (await import("../../commands/module/dev")).moduleDevCommand;

  it("creates .damat, writes the entry, loads env, spawns, and cleans up", async () => {
    fsState.existsMap = {
      "/m/.damat": false,
      "/m/.damat/module-dev-entry.ts": true, // exists after write → unlinked
    };
    const cmd = await get();
    const { ctx } = createContext({ port: 4321 }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // .damat created since it did not exist.
    expect(mockMkdirSync).toHaveBeenCalledWith("/m/.damat", {
      recursive: true,
    });
    // Entry file written with the runModuleEntry bootstrap.
    const entry = writeCalls.find((w) =>
      w.path.endsWith("/.damat/module-dev-entry.ts"),
    );
    expect(entry!.content).toContain("runModuleEntry()");
    // Env loaded for the cwd.
    expect(loadEnvCalls.length).toBeGreaterThan(0);
    // Spawned bun --watch with the port wired into env.
    expect(spawnCalls[0]!.cmd).toEqual([
      "bun",
      "--watch",
      "--no-clear-screen",
      "/m/.damat/module-dev-entry.ts",
    ]);
    expect((spawnCalls[0]!.env as Record<string, string>).PORT).toBe("4321");
    // Entry cleaned up.
    expect(unlinkCalls).toContain("/m/.damat/module-dev-entry.ts");
  });
});
