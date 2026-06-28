import { describe, expect, test } from "bun:test";

/**
 * @damatjs/orm-type is composed entirely of TypeScript `type`/`interface`
 * declarations with zero runtime exports (verified: no const/function/class/
 * default exports in any src file). There is no runtime behavior to assert.
 *
 * This is a minimal load-guard: it confirms the public entrypoint imports
 * cleanly (e.g. no syntax errors, no circular-import runtime crash) and that,
 * as expected, it contributes no runtime values to the module namespace.
 */
describe("@damatjs/orm-type entrypoint", () => {
  test("src/index.ts imports without throwing", async () => {
    const mod = await import("../index");
    expect(mod).toBeDefined();
  });

  test("exposes no runtime exports (pure type package)", async () => {
    const mod = await import("../index");
    // Type-only re-exports are erased at runtime, so the namespace object has
    // no own enumerable runtime values.
    const runtimeKeys = Object.keys(mod).filter((k) => k !== "default");
    expect(runtimeKeys).toEqual([]);
  });
});
