import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("reports 'no pending migrations' when nothing was applied", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    // applied empty but hadMigrations true → already up to date.
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    expect(logger.success).not.toHaveBeenCalled();
  });
});
