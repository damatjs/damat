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
  it("single-module run surfaces a generation failure as exit 1", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": true };
    cg.runThrows = new Error("gen failed");
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
