import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, gw, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("aborts if no gateway URL", async () => {
    basePublishSetup();
    delete process.env.DAMAT_MODULE_REGISTRY;
    delete process.env.DAMAT_PUBLISH_REGISTRY;

    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    const errCall = logger.error.mock.calls.find(
      (c) =>
        String(c[0]).toLowerCase().includes("registry") ||
        String(c[0]).toLowerCase().includes("gateway"),
    );
    expect(errCall).toBeDefined();
    expect(gw.calls).toHaveLength(0);
  });
});
