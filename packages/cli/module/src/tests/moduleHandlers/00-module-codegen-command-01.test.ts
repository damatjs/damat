import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module codegen command", () => {
  const get = async () =>
    (await import("../../commands/module/codegen")).moduleCodegenCommand;

  it("omits the scaffold line when nothing was scaffolded", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalledTimes(1);
  });
});
