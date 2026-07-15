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
  it("errors when the models directory is missing", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": false };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(cg.runArgs).toBeNull();
  });
});
