import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, ms, getCmd } from "./context";

describe("damat module migration:status command", () => {
  it("reports the headline via success when everything is applied", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.result = {
      moduleName: "demo",
      applied: 2,
      pending: 0,
      migrations: [
        { name: "Migration1_Initial", applied: true },
        { name: "Migration2_Widgets", applied: true },
      ],
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Headline (success) + two applied lines (success) = 3 success calls.
    expect(logger.success).toHaveBeenCalledTimes(3);
  });
});
