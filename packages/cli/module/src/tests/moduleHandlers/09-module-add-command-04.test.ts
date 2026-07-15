import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("refuses to overwrite an existing target without --force", async () => {
    baseLocalInstall({ "/app/src/modules/user": true });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("already exists"),
      ),
    ).toBe(true);
  });
});
