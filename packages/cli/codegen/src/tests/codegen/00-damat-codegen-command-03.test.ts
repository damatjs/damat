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
  it("--all generates every non-link module", async () => {
    cg.modules = {
      user: { resolve: "/app/src/modules/user" },
      organization: { resolve: "/app/src/modules/organization" },
      userLink: { resolve: "/app/src/links/user", kind: "link" },
    };
    fsState.existsMap = {
      "/app/src/modules/user/models": true,
      "/app/src/modules/organization/models": true,
    };
    const cmd = await getCmd();
    const { ctx } = createContext({ all: true }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // user + organization generated; the link module is skipped.
    expect(cg.runArgsList.map((a) => a.moduleId).sort()).toEqual([
      "organization",
      "user",
    ]);
  });
});
