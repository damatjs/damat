import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, createContext, ms, getCmd } from "./context";

describe("damat module migration:status command", () => {
  it("errors and does not connect when DATABASE_URL is unset", async () => {
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(ms.calls).toHaveLength(0);
  });
});
