import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module validate command", () => {
  const get = async () =>
    (await import("../../commands/module/validate")).moduleValidateCommand;

  it("invalid logs errors and exits 1", async () => {
    mm.validateReport = {
      valid: false,
      errors: ["e1"],
      warnings: [],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("e1");
  });
});
