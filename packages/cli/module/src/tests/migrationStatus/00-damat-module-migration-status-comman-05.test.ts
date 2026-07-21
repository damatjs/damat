import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, ms, getCmd } from "./context";

describe("damat module migration:status command", () => {
  it("fails when status cannot be read", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.throws = new Error("connection refused");
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
