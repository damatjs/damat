import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, rmCalls, describe, it, expect, createContext, barrelCalls, maps, configWithUser, dirent } from "./context";

describe("module remove command", () => {
  const get = async () =>
    (await import("../../commands/module/remove")).moduleRemoveCommand;

  it("--dry-run prints the plan and deletes/writes nothing", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/modules/user/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/src/modules/user/module.json": JSON.stringify({ name: "user" }),
    };
    maps.readdir = { "/app/src/modules": [dirent("user")] };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "dry-run": true, "clean-env": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    const plan = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("Dry run"),
    );
    expect(plan).toBeDefined();
    expect(plan![0]).toContain("delete src/modules/user/");
    expect(plan![0]).toContain('deregister "user" from damat.config.ts');
    expect(plan![0]).toContain('remove "@user/*" alias');
    expect(plan![0]).toContain("# --- module: user ---");
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
    expect(barrelCalls).toHaveLength(0);
  });
});
