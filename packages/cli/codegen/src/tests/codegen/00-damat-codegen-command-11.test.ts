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
  it("rebuilds the workflow barrels after a single-module run", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    await cmd.handler(ctx);
    expect(cg.barrelCalls.length).toBeGreaterThan(0);
  });
});
