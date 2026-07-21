import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  spawnCalls,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("type-checks then validates, succeeding when both pass", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true }; // tsc runs (exit 0)
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // The type-check runs through the active Bun executable.
    expect(spawnCalls[0]!.cmd).toEqual([
      process.execPath,
      "x",
      "tsc",
      "--noEmit",
    ]);
    expect(logger.success).toHaveBeenCalledWith("Module build OK");
  });
});
