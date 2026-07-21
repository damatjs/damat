import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  describe,
  it,
  expect,
  fsState,
  createContext,
  cg,
  getCmd,
} from "./context";

describe("damat codegen command", () => {
  it("--all reports a non-zero exit when a module's generation throws", async () => {
    cg.modules = {
      user: { resolve: "/app/src/modules/user" },
      org: { resolve: "/app/src/modules/org" },
    };
    fsState.existsMap = {
      "/app/src/modules/user/models": true,
      "/app/src/modules/org/models": true,
    };
    cg.runThrows = new Error("explode");
    const cmd = await getCmd();
    const { ctx, logger } = createContext(
      { all: true },
      { args: [], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    // Barrels are rebuilt even on a partial-failure run.
    expect(cg.barrelCalls.length).toBeGreaterThan(0);
  });
});
