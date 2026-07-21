import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("aborts with the tsc exit code when the type-check fails", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    fsState.spawnExitCode = 3;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(3);
    expect(mm.calls.some((c) => c.startsWith("locate"))).toBe(false);
  });
});
