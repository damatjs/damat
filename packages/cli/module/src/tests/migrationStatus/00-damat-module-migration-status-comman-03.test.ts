import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, ms, getCmd } from "./context";

describe("damat module migration:status command", () => {
  it("reports the headline via info and lists migrations when some are pending", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.result = {
      moduleName: "demo",
      applied: 1,
      pending: 1,
      migrations: [
        { name: "Migration1_Initial", applied: true },
        { name: "Migration2_Widgets", applied: false },
      ],
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Pending > 0 → headline goes to info, not success.
    expect(logger.info).toHaveBeenCalled();
    // One applied (success) line + one pending (info) line below the headline.
    expect(logger.success).toHaveBeenCalledTimes(1);
  });
});
