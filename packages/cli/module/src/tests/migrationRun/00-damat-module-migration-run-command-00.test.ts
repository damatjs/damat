import {
  beforeEach as registerReset,
  afterEach as registerCleanup,
} from "bun:test";
import { resetContext, cleanupContext } from "./context";
registerReset(resetContext);
registerCleanup(cleanupContext);

import { describe, it, expect, getCmd } from "./context";

describe("damat module migration:run command", () => {
  it("has the expected wiring", async () => {
    const c = await getCmd();
    expect(c.name).toBe("migration:run");
    expect(typeof c.handler).toBe("function");
  });
});
