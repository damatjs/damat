import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, rmCalls, writeCalls, describe, it, expect } from "./context";

describe("removeModuleSplit", () => {
  const cwd = "/app";

  it("is a no-op when the module occupies nothing", async () => {
    fsState.existsDefault = false;
    const { removeModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual([]);
    expect(result.linksRegenerated).toBe(false);
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });
});
