import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("module add guards (guard.ts)", () => {
  const get = async () => import("../../commands/module/helpers/guard");

  it("modulesDirError rejects absolute paths and .. segments", async () => {
    const { modulesDirError } = await get();
    expect(modulesDirError("src/modules")).toBeNull();
    expect(modulesDirError("src/./modules")).toBeNull();
    for (const dir of ["/etc", "../out", "src/../../up", ""]) {
      expect(modulesDirError(dir)).toContain("--dir");
    }
  });
});
