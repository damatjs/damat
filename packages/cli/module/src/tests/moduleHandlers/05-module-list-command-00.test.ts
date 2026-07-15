import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext } from "./context";

describe("module list command", () => {
  const get = async () =>
    (await import("../../commands/module/list")).moduleListCommand;

  it("reports when the modules directory is absent", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(
      "No modules directory at src/modules",
    );
  });
});
