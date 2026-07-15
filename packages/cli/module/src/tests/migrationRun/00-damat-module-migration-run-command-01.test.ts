import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, mm, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("errors and does not connect when DATABASE_URL is unset", async () => {
    // DATABASE_URL deleted in beforeEach — the guard short-circuits the run.
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(mm.calls).toHaveLength(0);
  });
});
