import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("fails and logs errors/warnings when validation reports invalid", async () => {
    fsState.existsDefault = false;
    mm.validateReport = {
      valid: false,
      errors: ["e1"],
      warnings: ["w1"],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("e1");
    expect(logger.warn).toHaveBeenCalledWith("w1");
  });
});
