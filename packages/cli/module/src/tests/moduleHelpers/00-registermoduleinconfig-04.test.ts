import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("quotes a non-identifier module key", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    fn("/app/damat.config.ts", "1weird", "./src/modules/1weird");
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain('"1weird":');
  });
});
