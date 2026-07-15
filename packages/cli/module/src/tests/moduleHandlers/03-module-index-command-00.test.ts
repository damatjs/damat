import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module index command", () => {
  it("prints the help banner and exits 0", async () => {
    const { moduleCommand } = await import("../../commands/module/index");
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await moduleCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    expect(moduleCommand.name).toBe("module");
  });
});
