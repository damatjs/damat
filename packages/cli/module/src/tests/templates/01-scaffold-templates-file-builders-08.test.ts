import { describe, it, expect, gitignoreTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("gitignoreTemplate ignores node_modules and .env", () => {
    const out = gitignoreTemplate();
    expect(out).toContain("node_modules");
    expect(out).toContain(".env");
  });
});
