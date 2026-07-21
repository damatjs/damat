import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  rmCalls,
  mockExistsSync,
  describe,
  it,
  expect,
} from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("refuses a github-shorthand subpath that escapes the clone (path traversal)", async () => {
    // The temp dir exists after clone, so the only thing that can fail is the
    // containment check — a `..`-laden subpath resolves outside the checkout.
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    await expect(fn("acme/mod/../../etc", "/cwd")).rejects.toThrow(
      /escapes the cloned repository/,
    );
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });
});
