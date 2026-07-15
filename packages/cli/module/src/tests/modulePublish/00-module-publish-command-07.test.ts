import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  describe,
  it,
  expect,
  createContext,
  gw,
  basePublishSetup,
} from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("token flag overrides env", async () => {
    basePublishSetup();

    const cmd = await get();
    const { ctx } = createContext({ token: "flag-tok" }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(
      (gw.calls[0]?.headers as Record<string, string>)?.authorization,
    ).toBe("Bearer flag-tok");
  });
});
