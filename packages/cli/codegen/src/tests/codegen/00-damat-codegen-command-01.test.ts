import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getCmd } from "./context";

describe("damat codegen command", () => {
  it("errors when the config has no modules", async () => {
    cg.modules = {};
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(cg.runArgs).toBeNull();
  });
});
