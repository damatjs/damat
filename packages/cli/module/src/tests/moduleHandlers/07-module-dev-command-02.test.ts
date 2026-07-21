import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext } from "./context";

describe("module dev command", () => {
  const get = async () =>
    (await import("../../commands/module/dev")).moduleDevCommand;

  it("returns the subprocess exit code", async () => {
    fsState.existsDefault = false;
    fsState.spawnExitCode = 7;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(7);
  });
});
