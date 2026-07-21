import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  writeCalls,
  mockMkdirSync,
  mockWriteFileSync,
  describe,
  it,
  expect,
  createContext,
} from "./context";

describe("module init command", () => {
  const get = async () =>
    (await import("../../commands/module/init")).moduleInitCommand;

  it("scaffolds the full package tree to the default dir", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx, logger } = createContext(
      { databaseSetup: false },
      { args: ["user"], cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
    // Every scaffold file was written under the target dir.
    const written = writeCalls.map((w) => w.path);
    expect(written).toContain("/m/user/package.json");
    expect(written).toContain("/m/user/src/index.ts");
    expect(written).toContain("/m/user/src/config/index.ts");
    expect(written).toContain("/m/user/AGENTS.md");
    expect(written).toContain("/m/user/.env");
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});
