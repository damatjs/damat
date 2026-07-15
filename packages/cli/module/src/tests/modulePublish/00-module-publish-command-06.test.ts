import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  describe,
  it,
  expect,
  createContext,
  mm,
  gw,
  basePublishSetup,
} from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("aborts when validate fails", async () => {
    basePublishSetup();
    mm.validateReport = {
      valid: false,
      errors: ["bad"],
      warnings: [],
      manifest: { name: "user" },
    };

    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(gw.calls).toHaveLength(0);
  });
});
