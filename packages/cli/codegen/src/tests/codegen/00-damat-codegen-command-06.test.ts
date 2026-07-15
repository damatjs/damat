import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getCmd } from "./context";

describe("damat codegen command", () => {
  it("skips link modules with exit 0 and does not run codegen", async () => {
    cg.modules = { user: { resolve: "/app/src/links/user", kind: "link" } };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.runArgs).toBeNull();
  });
});
