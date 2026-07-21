import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getBarrel } from "./context";

describe("damat barrel command", () => {
  it("fails when generation throws", async () => {
    cg.barrelThrows = new Error("barrel boom");
    const cmd = await getBarrel();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
