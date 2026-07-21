import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module codegen command", () => {
  const get = async () =>
    (await import("../../commands/module/codegen")).moduleCodegenCommand;

  it("reports generated files and scaffold count on success", async () => {
    mm.generateResult = {
      outputDir: "/m/types",
      files: ["users.ts", "registry.ts"],
      scaffolded: ["createUsers.ts"],
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalledTimes(2);
  });
});
