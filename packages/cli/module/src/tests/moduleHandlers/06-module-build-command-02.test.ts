import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  spawnCalls,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module build command", () => {
  const get = async () =>
    (await import("../../commands/module/build")).moduleBuildCommand;

  it("skips the type-check with --no-typecheck and still validates", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    const cmd = await get();
    const { ctx } = createContext({ typecheck: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(0); // no tsc spawned
  });
});
