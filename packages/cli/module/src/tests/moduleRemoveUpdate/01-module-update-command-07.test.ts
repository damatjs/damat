import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, cpCalls, describe, it, expect, createContext, withVerifyPolicy, configWithUser } from "./context";

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

  it("refuses a recorded path source without --allow-unverified", async () => {
    await withVerifyPolicy(undefined, async () => {
      baseInstalled();
      const cmd = await get();
      const { ctx, logger } = createContext(
        { dir: "src/modules" },
        { args: ["user"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("--allow-unverified"),
        ),
      ).toBe(true);
      expect(cpCalls).toHaveLength(0);
    });
  });
});
