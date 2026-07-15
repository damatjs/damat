import { describe, it, expect, toCamel } from "./context";

describe("scaffold/templates string helpers", () => {
  it("toCamel converts kebab segments", () => {
    expect(toCamel("user-management")).toBe("userManagement");
    expect(toCamel("user")).toBe("user");
    expect(toCamel("a-1-b")).toBe("a1B");
  });
});
