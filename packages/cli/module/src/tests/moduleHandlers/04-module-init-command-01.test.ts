import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext } from "./context";

describe("module init command", () => {
  const get = async () =>
    (await import("../../commands/module/init")).moduleInitCommand;

  it("errors when the target dir already exists", async () => {
    fsState.existsMap = { "/m/user": true };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { args: ["user"], cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
