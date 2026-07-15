import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, mockReaddirSync, describe, it, expect, createContext, configWithUser } from "./context";

describe("module remove command", () => {
  const get = async () =>
    (await import("../../commands/module/remove")).moduleRemoveCommand;

  it("reports a failure when the dependents scan throws", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
    };
    fsState.readFileMap = { "/app/damat.config.ts": configWithUser };
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/app/src/modules") throw new Error("EACCES");
      return [] as never;
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Failed to remove module"),
      ),
    ).toBe(true);
  });
});
