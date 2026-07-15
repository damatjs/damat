import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  rmCalls,
  mockSpawnSync,
  describe,
  it,
  expect,
} from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("throws and cleans up when git clone fails", async () => {
    fsState.existsDefault = false;
    // Availability probe passes, the clone itself fails.
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 128, stdout: "", stderr: "fatal: nope" }) as never,
      );
    const fn = await get();
    await expect(fn("https://github.com/acme/mod.git", "/cwd")).rejects.toThrow(
      /git clone failed/,
    );
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });
});
