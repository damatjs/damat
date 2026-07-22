import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  writeCalls,
  unlinkCalls,
  spawnCalls,
  mockMkdirSync,
  describe,
  it,
  expect,
  createContext,
} from "./context";
import { getModuleDevCommand } from "./devContext";

describe("module dev command", () => {
  it("creates .damat, writes the entry, spawns, and cleans up", async () => {
    fsState.existsMap = {
      "/m/.damat": false,
      "/m/.damat/module-dev-entry.ts": true, // exists after write → unlinked
    };
    const cmd = await getModuleDevCommand();
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
    // Spawned the supervised Bun child with the port wired into env.
    expect(spawnCalls[0]!.cmd).toEqual([
      "bun",
      "/m/.damat/module-dev-entry.ts",
    ]);
    expect((spawnCalls[0]!.env as Record<string, string>).PORT).toBe("4321");
    // Entry cleaned up.
    expect(unlinkCalls).toContain("/m/.damat/module-dev-entry.ts");
  });
});
