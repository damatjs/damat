import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, cpCalls, describe, it, expect, createContext, mm, configWithUser } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("refuses a registry update that fails verification", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/cache/user": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser
        .replace('type: "path"', 'type: "registry"')
        .replace('ref: "/pkg"', 'ref: "user"'),
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.1.0",
      owner: { namespace: "acme" },
      verification: { status: "unverified" },
    };
    mm.verification = {
      allowed: false,
      status: "unverified",
      message: "blocked",
    };
    mm.locateResult = "/cache/user/src";
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes('Refusing to update "user": blocked'),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });
});
