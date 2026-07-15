import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, mockReadFileSync, describe, it, expect, createContext, configWithUser } from "./context";

describe("module remove command", () => {
  const get = async () =>
    (await import("../../commands/module/remove")).moduleRemoveCommand;

  it("warns when the config entry and tsconfig cannot be updated", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
    };
    // First config read (entry lookup) sees the entry; the deregister re-read
    // sees a config it cannot edit safely → conservative false → warning.
    let configReads = 0;
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === "/app/damat.config.ts") {
        return ++configReads === 1 ? configWithUser : "const x = 1;";
      }
      return fsState.readFileMap[p as string] ?? "";
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update tsconfig.json"),
      ),
    ).toBe(true);
  });
});
