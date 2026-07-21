import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("deregisterModuleFromConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .deregisterModuleFromConfig;

  it("returns false when the module has no entry", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBe(false);
    expect(writeCalls).toHaveLength(0);
  });
});
