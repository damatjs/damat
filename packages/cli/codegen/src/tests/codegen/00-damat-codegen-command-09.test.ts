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
  it("--flat dumps routes flat (workflows still grouped)", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext(
      { flat: true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.runArgs).toMatchObject({
      routesRoot: "/app/src/api/routes",
      workflowsRoot: "/app/src/workflows/user",
    });
  });
});
