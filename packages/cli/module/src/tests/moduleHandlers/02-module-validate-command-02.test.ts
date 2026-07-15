import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module validate command", () => {
  const get = async () =>
    (await import("../../commands/module/validate")).moduleValidateCommand;

  it("valid-with-warnings reports info and logs the warnings", async () => {
    mm.validateReport = {
      valid: true,
      errors: [],
      warnings: ["w1"],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("w1");
    expect(logger.info).toHaveBeenCalled();
  });
});
