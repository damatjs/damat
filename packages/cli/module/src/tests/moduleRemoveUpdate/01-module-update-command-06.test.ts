import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, rmCalls, cpCalls, describe, it, expect, createContext, mm, configWithUser } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("--dry-run through the registry prints the diff summary and writes nothing", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/cache/user": true,
      "/cache/user/src": true,
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
      verification: { status: "verified" },
    };
    mm.verification = {
      allowed: true,
      status: "verified",
      message: "heads up",
    };
    mm.locateResult = "/cache/user/src";
    // Both trees read as empty → identical; module.json absent → "(unknown)".
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "dry-run": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("heads up");
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("identical")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("Dry run — nothing was written"),
      ),
    ).toBe(true);
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
    expect(rmCalls).toHaveLength(0);
  });
});
