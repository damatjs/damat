import { describe, it, expect, toPascal } from "./context";

describe("scaffold/templates string helpers", () => {
  it("toPascal upper-cases the first camelized char", () => {
    expect(toPascal("user-management")).toBe("UserManagement");
    expect(toPascal("user")).toBe("User");
  });
});
