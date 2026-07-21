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
  it("--all soft-skips modules whose models dir is missing", async () => {
    cg.modules = {
      user: { resolve: "/app/src/modules/user" },
      ghost: { resolve: "/app/src/modules/ghost" },
    };
    // Only `user` has a models directory.
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext({ all: true }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    // One missing module is a skip, not a failure of the whole run.
    expect(res.exitCode).toBe(0);
    expect(cg.runArgsList.map((a) => a.moduleId)).toEqual(["user"]);
  });
});
