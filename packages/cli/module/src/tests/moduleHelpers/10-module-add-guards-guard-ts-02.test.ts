import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("module add guards (guard.ts)", () => {
  const get = async () => import("../../commands/module/helpers/guard");

  it("unverifiedSourceError gates by opt-in flag and policy", async () => {
    const { unverifiedSourceError } = await get();
    expect(unverifiedSourceError("git", true, "warn")).toBeNull();
    expect(unverifiedSourceError("path", false, "off")).toBeNull();
    for (const policy of ["warn", "require"] as const) {
      const message = unverifiedSourceError("git", false, policy);
      expect(message).toContain("--allow-unverified");
    }
  });
});
