import { describe, it, expect, entryTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("entryTemplate wires the service class and module id", () => {
    const out = entryTemplate("user", "UserService");
    expect(out).toContain('export const MODULE_ID = "user";');
    expect(out).toContain("export { UserService, models };");
    expect(out).toContain("service: UserService,");
  });
});
