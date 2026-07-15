import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module codegen command", () => {
  const get = async () =>
    (await import("../../commands/module/codegen")).moduleCodegenCommand;

  it("fails when generation throws", async () => {
    mm.generateThrows = new Error("boom");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
