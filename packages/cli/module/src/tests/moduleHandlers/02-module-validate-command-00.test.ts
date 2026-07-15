import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module validate command", () => {
  const get = async () =>
    (await import("../../commands/module/validate")).moduleValidateCommand;

  it("fails when the module dir can't be located", async () => {
    mm.locateThrows = new Error("not a module");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
