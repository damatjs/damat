import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect, createContext } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("rejects an unsafe module id", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["Evil"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("kebab-case")),
    ).toBe(true);
  });
});
