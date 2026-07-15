import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { writeCalls, cpCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("--dry-run for a bare module plans only files/config/aliases", async () => {
    baseLocalInstall();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true, "dry-run": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    const plan = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("Dry run"),
    );
    expect(plan![0]).not.toContain("install routes");
    expect(plan![0]).not.toContain("install workflows");
    expect(plan![0]).not.toContain("install links");
    expect(plan![0]).not.toContain("bun add");
    expect(plan![0]).toContain('ensure "@user/*" + "@workflows" aliases');
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
  });
});
