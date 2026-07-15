import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, configWithUser } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("exits 1 when the recorded source cannot be resolved", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      // the recorded ref "???bad???" is not a path, registry ref, or git source
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser.replace(
        'ref: "/pkg"',
        'ref: "???bad???"',
      ),
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not resolve recorded source"),
      ),
    ).toBe(true);
  });
});
