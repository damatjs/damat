import { describe, it, expect, moduleConfigTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("moduleConfigTemplate references defineModuleConfig", () => {
    expect(moduleConfigTemplate()).toContain("defineModuleConfig");
  });
});
