import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, rmCalls, describe, it, expect, createContext, maps, configWithUser, dirent } from "./context";

describe("module remove command", () => {
  const get = async () =>
    (await import("../../commands/module/remove")).moduleRemoveCommand;

  it("refuses to remove a module that other installed modules depend on", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/modules/billing/module.json": true,
      "/app/src/modules/broken/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/src/modules/billing/module.json": JSON.stringify({
        modules: ["user"],
      }),
      "/app/src/modules/broken/module.json": "{not json", // ignored dependent
    };
    maps.readdir = {
      "/app/src/modules": [
        dirent("user"), // the module itself — skipped
        dirent("billing"),
        dirent("broken"),
        dirent("afile", false), // not a directory — skipped
      ],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    const refusal = logger.error.mock.calls.find((c) =>
      String(c[0]).includes("Refusing to remove"),
    );
    expect(refusal).toBeDefined();
    expect(String(refusal![0])).toContain("billing");
    expect(String(refusal![0])).not.toContain("broken");
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });
});
