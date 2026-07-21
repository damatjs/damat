import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  unlinkCalls,
  spawnCalls,
  mockMkdirSync,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module dev command", () => {
  const get = async () =>
    (await import("../../commands/module/dev")).moduleDevCommand;

  it("skips mkdir when .damat exists and omits PORT when no --port", async () => {
    fsState.existsMap = {
      "/m/.damat": true,
      "/m/.damat/module-dev-entry.ts": false,
    };
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(mockMkdirSync).not.toHaveBeenCalledWith("/m/.damat", {
      recursive: true,
    });
    expect("PORT" in (spawnCalls[0]!.env as Record<string, string>)).toBe(
      false,
    );
    expect(unlinkCalls).toContain("/m/.damat/module-dev-entry.ts");
  });
});
