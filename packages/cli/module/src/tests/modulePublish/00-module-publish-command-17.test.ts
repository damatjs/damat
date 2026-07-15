import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, gw, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("fails cleanly when tar cannot create the tarball", async () => {
    basePublishSetup();
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "tar: boom" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Failed to create tarball"),
      ),
    ).toBe(true);
    expect(gw.calls).toHaveLength(0);
  });
});
