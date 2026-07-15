import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, mm, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("hints to create a migration first when the module has none", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: [],
      pending: [],
      success: true,
      hadMigrations: false,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    // The module dir is the cwd we pass straight through.
    expect(mm.calls).toEqual(["/project"]);
  });
});
