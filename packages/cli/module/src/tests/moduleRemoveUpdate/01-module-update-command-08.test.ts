import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm, configWithUser } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  /** An installed local-path module whose provenance points at /pkg. */
  function baseInstalled(extra: Record<string, boolean> = {}) {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/pkg": true, // the recorded source resolves as a local path
      ...extra,
    };
    fsState.readFileMap = { "/app/damat.config.ts": configWithUser };
  }

  it("blocks an unverified source that fails local validation", async () => {
    baseInstalled();
    mm.validateReport = {
      valid: false,
      errors: ["broken entry"],
      warnings: [],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("broken entry");
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("failed validation"),
      ),
    ).toBe(true);
  });
});
