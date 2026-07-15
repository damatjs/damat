import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("reports a manifest read failure when validation is skipped", async () => {
    basePublishSetup();
    mm.locateThrows = new Error("gone");
    const cmd = await get();
    const { ctx, logger } = createContext({ validate: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not read module manifest"),
      ),
    ).toBe(true);
  });
});
