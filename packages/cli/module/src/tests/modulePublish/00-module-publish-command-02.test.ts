import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, gw, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("403 from gateway yields actionable error", async () => {
    basePublishSetup();
    gw.status = 403;
    gw.body = { error: "bad token" };

    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    const errCall = logger.error.mock.calls.find((c) =>
      String(c[0]).toLowerCase().includes("token"),
    );
    expect(errCall).toBeDefined();
  });
});
