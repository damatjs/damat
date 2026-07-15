import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, cg, getBarrel } from "./context";

describe("damat barrel command", () => {
  it("has the expected wiring and defaults to src/workflows", async () => {
    cg.barrelWritten = ["src/workflows/index.ts"];
    const cmd = await getBarrel();
    expect(cmd.name).toBe("barrel");
    const { ctx } = createContext({}, { args: [], cwd: "/app" });
    await cmd.handler(ctx);
    // Default target is <cwd>/src/workflows.
    expect(cg.barrelCalls.at(-1)![0]).toBe("/app/src/workflows");
  });
});
