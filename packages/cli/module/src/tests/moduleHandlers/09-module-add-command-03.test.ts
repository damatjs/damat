import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("warns about an unmet module dependency", async () => {
    baseLocalInstall({ "/app/src/modules/billing": false });
    mm.manifest = {
      name: "user",
      version: "1.0.0",
      description: "User",
      modules: ["billing"],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    await cmd.handler(ctx);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("billing")),
    ).toBe(true);
  });
});
