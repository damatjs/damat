import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { cpCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("rejects a --dir that is absolute or escapes the app", async () => {
    baseLocalInstall();
    const cmd = await get();
    for (const dir of ["/etc", "../outside", "src/../../up"]) {
      const { ctx, logger } = createContext(
        { dir, "allow-unverified": true },
        { args: ["/pkg"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) => String(c[0]).includes("--dir")),
      ).toBe(true);
    }
    expect(cpCalls).toHaveLength(0);
  });
});
