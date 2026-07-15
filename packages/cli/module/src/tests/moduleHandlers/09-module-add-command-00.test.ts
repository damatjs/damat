import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("errors when no source argument is given", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
