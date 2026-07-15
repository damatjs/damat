import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { writeCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("installs a plain local module and registers it everywhere", async () => {
    baseLocalInstall();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Registered in config + tsconfig aliases written + success logged.
    expect(writeCalls.some((w) => w.path === "/app/damat.config.ts")).toBe(
      true,
    );
    expect(writeCalls.some((w) => w.path === "/app/tsconfig.json")).toBe(true);
    expect(logger.success).toHaveBeenCalled();
    // path-source provenance branch (not registry).
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[1] && JSON.stringify(c[1])).includes('"from":"path"'),
      ),
    ).toBe(true);
  });
});
