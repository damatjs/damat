import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("readModuleConfigEntry", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .readModuleConfigEntry;

  it("returns null when the module has no entry", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBeNull();
  });
});
