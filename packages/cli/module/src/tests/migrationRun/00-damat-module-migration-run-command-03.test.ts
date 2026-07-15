import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, mm, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("reports applied migrations on success", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: ["Migration20260101000000_Initial"],
      pending: ["Migration20260101000000_Initial"],
      success: true,
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });
});
