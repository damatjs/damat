import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module init command", () => {
  const get = async () =>
    (await import("../../commands/module/init")).moduleInitCommand;

  it("rejects a missing or invalid name", async () => {
    const cmd = await get();
    for (const args of [[], ["Bad_Name"], ["1bad"]]) {
      const { ctx, logger } = createContext({}, { args, cwd: "/m" });
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    }
  });
});
