import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module migration:create command", () => {
  const get = async () =>
    (await import("../../commands/module/migrationCreate"))
      .moduleMigrationCreateCommand;

  it("reports the created migration when changes exist", async () => {
    mm.migrationResult = { hasChanges: true, filePath: "/m/migrations/x.ts" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });
});
