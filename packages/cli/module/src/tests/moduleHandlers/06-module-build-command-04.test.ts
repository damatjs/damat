import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("fails when the module dir cannot be located during validation", async () => {
    fsState.existsDefault = false; // no tsconfig → typecheck skipped
    mm.locateThrows = new Error("not a module");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
