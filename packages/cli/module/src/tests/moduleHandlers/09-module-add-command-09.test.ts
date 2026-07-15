import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("refuses a registry install that fails verification", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": false,
      "/cache/user": true, // the record's resolved source
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.0.0",
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
      logger.error.mock.calls.some((c) => String(c[0]).includes("Refusing")),
    ).toBe(true);
  });
});
