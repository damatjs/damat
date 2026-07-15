import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall, withVerifyPolicy } from "./context";
registerReset(resetContext);

import { writeCalls, cpCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("refuses a path source without --allow-unverified, writing nothing", async () => {
    await withVerifyPolicy(undefined, async () => {
      baseLocalInstall();
      const cmd = await get();
      const { ctx, logger } = createContext(
        { dir: "src/modules" },
        { args: ["/pkg"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("--allow-unverified"),
        ),
      ).toBe(true);
      expect(cpCalls).toHaveLength(0);
      expect(writeCalls).toHaveLength(0);
    });
  });
});
