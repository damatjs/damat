import { describe, it, expect, readmeTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("readmeTemplate embeds the module name", () => {
    const out = readmeTemplate("user");
    expect(out).toContain("# user");
    expect(out).toContain('getModule("user")');
  });
});
