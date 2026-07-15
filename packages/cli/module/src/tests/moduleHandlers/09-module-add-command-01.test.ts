import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("errors when the source cannot be resolved", async () => {
    fsState.existsDefault = false;
    mm.parseRef = null; // not a registry ref; "/nope" not a path → throws
    const cmd = await get();
    const { ctx, logger } = createContext(
      {},
      { args: ["???bad???"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
