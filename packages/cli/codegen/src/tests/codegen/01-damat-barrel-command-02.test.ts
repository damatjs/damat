import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getBarrel } from "./context";

describe("damat barrel command", () => {
  it("warns when nothing was barreled", async () => {
    cg.barrelWritten = [];
    const cmd = await getBarrel();
    const { ctx, logger } = createContext(
      {},
      { args: ["missing"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalled();
  });
});
