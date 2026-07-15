import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("reports a failure when installModuleSplit throws (inner catch)", async () => {
    baseLocalInstall();
    // Make readModuleManifest throw AFTER resolveModuleSource succeeds → the
    // inner try/catch reports and the finally still runs cleanup.
    mm.manifest = undefined as never;
    const cmd = await get();
    // readModuleManifest returns undefined → manifest.name throws inside try.
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
