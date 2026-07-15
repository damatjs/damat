import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  describe,
  it,
  expect,
  createContext,
  gw,
  basePublishSetup,
} from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("fails with the tsc exit code when the type-check fails", async () => {
    basePublishSetup();
    fsState.spawnExitCode = 2;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(2);
    expect(gw.calls).toHaveLength(0);
  });
});
