import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  spawnCalls,
  describe,
  it,
  expect,
  createContext,
  basePublishSetup,
} from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("--no-typecheck skips tsc", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx } = createContext({ typecheck: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(0);
  });
});
