import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getCmd } from "./context";

describe("damat codegen command", () => {
  it("errors when no module name is given and --all is not passed", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    // Default is name-by-name; no name + no --all is an explicit error, not "all".
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(cg.runArgs).toBeNull();
  });
});
