import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, getCmd } from "./context";

describe("damat codegen command", () => {
  it("has the expected wiring", async () => {
    const c = await getCmd();
    expect(c.name).toBe("codegen");
    expect(typeof c.handler).toBe("function");
  });
});
