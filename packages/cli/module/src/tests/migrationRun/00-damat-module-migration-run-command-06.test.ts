import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, mm, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("fails when a migration errors", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: [],
      pending: ["Migration20260101000000_Initial"],
      success: false,
      error: new Error("boom"),
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
