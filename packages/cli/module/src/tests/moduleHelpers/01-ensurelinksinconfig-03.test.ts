import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("ensureLinksInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config")).ensureLinksInConfig;

  it("returns false when there is no closing }) to anchor to", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = { "/app/damat.config.ts": `const x = 1;` };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(false);
  });
});
