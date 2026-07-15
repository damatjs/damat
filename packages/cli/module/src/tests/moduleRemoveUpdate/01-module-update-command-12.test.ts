import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, configWithUser } from "./context";

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

  it("fails when the package install fails after applying", async () => {
    baseInstalled({
      "/pkg/package.json": true,
      "/app/src/modules/user/module.json": true, // broken → version "(unknown)"
    });
    fsState.readFileMap["/pkg/package.json"] = JSON.stringify({
      dependencies: { stripe: "^14.0.0" },
    });
    fsState.readFileMap["/app/src/modules/user/module.json"] = "{not json";
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "boom" };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("bun add failed"),
      ),
    ).toBe(true);
  });
});
