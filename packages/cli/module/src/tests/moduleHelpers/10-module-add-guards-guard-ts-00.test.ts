import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("module add guards (guard.ts)", () => {
  const get = async () => import("../../commands/module/helpers/guard");

  it("moduleIdError accepts kebab-case ids and rejects everything else", async () => {
    const { moduleIdError } = await get();
    expect(moduleIdError("user-management")).toBeNull();
    for (const id of ["../evil", "a/b", "..", "Evil", "1bad", ""]) {
      expect(moduleIdError(id)).toContain("kebab-case");
    }
  });
});
