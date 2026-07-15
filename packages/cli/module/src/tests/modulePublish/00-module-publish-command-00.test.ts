import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { spawnCalls, spawnSyncCalls, describe, it, expect, createContext, gw, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("publishes successfully with full flow", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    // Type-check ran (bunx tsc --noEmit).
    expect(spawnCalls[0]?.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    // tar was called.
    const tarCall = spawnSyncCalls.find((c) => c.cmd === "tar");
    expect(tarCall).toBeDefined();
    expect(tarCall?.args[0]).toBe("-czf");
    // PUT to gateway.
    expect(gw.calls).toHaveLength(1);
    expect(gw.calls[0]?.url).toContain("/api/npm/user");
    expect(gw.calls[0]?.method).toBe("PUT");
    expect(
      (gw.calls[0]?.headers as Record<string, string>)?.authorization,
    ).toBe("Bearer tok123");
    // Success logged.
    expect(logger.success).toHaveBeenCalled();
    const successCall = logger.success.mock.calls.find((c) =>
      String(c[0]).includes("user@1.0.0"),
    );
    expect(successCall).toBeDefined();
  });
});
