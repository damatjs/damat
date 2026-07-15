import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("ensureLinksInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config")).ensureLinksInConfig;

  it("leaves an existing links: key untouched", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({ links: "./src/links" });`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(true);
    expect(
      writeCalls.find((c) => c.path === "/app/damat.config.ts"),
    ).toBeUndefined();
  });
});
