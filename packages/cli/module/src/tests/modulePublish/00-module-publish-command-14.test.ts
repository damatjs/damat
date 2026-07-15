import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("rejects a package.json without a version", async () => {
    basePublishSetup();
    fsState.readFileMap["/m/package.json"] = JSON.stringify({ name: "user" });
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("`version`")),
    ).toBe(true);
  });
});
