import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  rmCalls,
  describe,
  it,
  expect,
  createContext,
  basePublishSetup,
} from "./context";

describe("module publish command", () => {
  const get = async () =>
    (await import("../../commands/module/publish")).modulePublishCommand;

  it("cleans up temp dir in finally (rmSync called)", async () => {
    basePublishSetup();

    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    await cmd.handler(ctx);

    // rmSync should have been called for the temp dir cleanup.
    expect(rmCalls.length).toBeGreaterThan(0);
    const cleanupCall = rmCalls.find((c) =>
      String(c.path).includes("damat-publish-"),
    );
    expect(cleanupCall).toBeDefined();
  });
});
