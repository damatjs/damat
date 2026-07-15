import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { cpCalls, describe, it, expect } from "./context";

describe("copyModule", () => {
  it("copies a directory recursively, filtering VCS/deps", async () => {
    const { copyModule } = await import("../../commands/module/helpers/copy");
    copyModule("/src/mod", "/dest/mod");
    const call = cpCalls.find((c) => c.src === "/src/mod");
    expect(call).toBeDefined();
    expect((call!.opts as { recursive: boolean }).recursive).toBe(true);
    // The filter rejects .git / node_modules paths.
    const filter = (call!.opts as { filter: (s: string) => boolean }).filter;
    expect(filter("/src/mod/models/user.ts")).toBe(true);
    expect(filter("/src/mod/.git")).toBe(false);
    expect(filter("/src/mod/.git/config")).toBe(false);
    expect(filter("/src/mod/node_modules")).toBe(false);
    expect(filter("/src/mod/node_modules/x")).toBe(false);
  });
});
