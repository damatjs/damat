import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  writeCalls,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module init command", () => {
  const get = async () =>
    (await import("../../commands/module/init")).moduleInitCommand;

  it("honours an explicit --dir", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "packages/user" },
      { args: ["user"], cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(writeCalls.some((w) => w.path.startsWith("/m/packages/user/"))).toBe(
      true,
    );
  });
});
