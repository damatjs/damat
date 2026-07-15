import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { cpCalls, describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("blocks an unverified source that fails local validation", async () => {
    baseLocalInstall();
    mm.validateReport = {
      valid: false,
      errors: ["broken entry"],
      warnings: [],
      manifest: { name: "user" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("failed validation"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });
});
