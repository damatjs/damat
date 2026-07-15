import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("skips validation with --no-validate", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    const cmd = await get();
    const { ctx, logger } = createContext({ validate: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(mm.calls.some((c) => c.startsWith("locate"))).toBe(false);
    expect(logger.success).toHaveBeenCalledWith("Module build OK");
  });
});
