import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall, withVerifyPolicy } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("honours DAMAT_MODULE_VERIFY=off as the unverified opt-in", async () => {
    await withVerifyPolicy("off", async () => {
      baseLocalInstall();
      const cmd = await get();
      const { ctx } = createContext(
        { dir: "src/modules" },
        { args: ["/pkg"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(0);
    });
  });
});
