import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext, gw, basePublishSetup } from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("--dry-run skips the PUT", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx, logger } = createContext({ "dry-run": true }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(gw.calls).toHaveLength(0);
    const dryRunMsg = logger.info.mock.calls.find((c) =>
      String(c[0]).toLowerCase().includes("dry run"),
    );
    expect(dryRunMsg).toBeDefined();
    expect(String(dryRunMsg?.[0])).toContain("user@1.0.0");
  });
});
