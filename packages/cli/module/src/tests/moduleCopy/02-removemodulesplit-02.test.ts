import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleSplit", () => {
  const cwd = "/app";

  it("skips the aggregator when the links root itself is gone", async () => {
    fsState.existsMap = {
      "/app/src/links/user": true, // had links…
      "/app/src/links": false, // …but the whole links root was deleted too
    };
    const { removeModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual(["/app/src/links/user"]);
    expect(result.linksRegenerated).toBe(false);
    expect(writeCalls).toHaveLength(0);
  });
});
