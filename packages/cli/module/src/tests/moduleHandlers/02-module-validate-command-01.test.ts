import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module validate command", () => {
  const get = async () =>
    (await import("../../commands/module/validate")).moduleValidateCommand;

  it("succeeds clean when valid with no warnings", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });
});
