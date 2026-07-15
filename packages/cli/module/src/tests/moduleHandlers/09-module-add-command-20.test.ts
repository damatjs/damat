import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { cpCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("rejects a --name override that is not a safe module id", async () => {
    baseLocalInstall();
    const cmd = await get();
    for (const name of ["../evil", "a/b", "..", "Evil"]) {
      const { ctx, logger } = createContext(
        { dir: "src/modules", name, "allow-unverified": true },
        { args: ["/pkg"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("kebab-case"),
        ),
      ).toBe(true);
    }
    expect(cpCalls).toHaveLength(0);
  });
});
