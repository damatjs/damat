import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module migration:create command", () => {
  const get = async () =>
    (await import("../../commands/module/migrationCreate"))
      .moduleMigrationCreateCommand;

  it("says no changes when nothing differs", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("No schema changes detected");
  });
});
