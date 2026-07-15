import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module migration:create command", () => {
  const get = async () =>
    (await import("../../commands/module/migrationCreate"))
      .moduleMigrationCreateCommand;

  it("fails when the diff throws", async () => {
    mm.migrationThrows = new Error("nope");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
