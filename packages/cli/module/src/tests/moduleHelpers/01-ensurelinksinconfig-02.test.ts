import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("ensureLinksInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config")).ensureLinksInConfig;

  it("inserts links before the closing })", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  name: "app",\n});\n`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain('links: "./src/links"');
  });
});
