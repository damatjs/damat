import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getCmd } from "./context";

describe("damat codegen command", () => {
  it("errors when the module is not in the config", async () => {
    cg.modules = { other: { resolve: "/app/src/modules/other" } };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(cg.runArgs).toBeNull();
  });
});
