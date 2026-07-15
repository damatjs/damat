import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("prints validation warnings while still publishing", async () => {
    basePublishSetup();
    mm.validateReport = {
      valid: true,
      errors: [],
      warnings: ["manifest: description is empty"],
      manifest: { name: "user" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("description is empty"),
      ),
    ).toBe(true);
  });
});
