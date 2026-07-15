import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getBarrel } from "./context";

describe("damat barrel command", () => {
  it("reports the number of barrels written", async () => {
    cg.barrelWritten = ["a/index.ts", "b/index.ts"];
    const cmd = await getBarrel();
    const { ctx, logger } = createContext(
      {},
      { args: ["src/foo"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.barrelCalls.at(-1)![0]).toBe("/app/src/foo");
    expect(logger.success).toHaveBeenCalled();
  });
});
