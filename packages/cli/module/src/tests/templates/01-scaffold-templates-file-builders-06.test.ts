import { describe, it, expect, contractTestTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("contractTestTemplate references validateModuleDir", () => {
    const out = contractTestTemplate("user");
    expect(out).toContain("user module contract");
    expect(out).toContain("validateModuleDir");
    expect(out).toContain('join(import.meta.dir, "../")');
    expect(out).not.toContain('"../src"');
  });
});
