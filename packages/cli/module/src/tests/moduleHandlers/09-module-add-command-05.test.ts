import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("installs over an existing target with --force", async () => {
    baseLocalInstall({ "/app/src/modules/user": true });
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "src/modules", force: true, "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
  });
});
