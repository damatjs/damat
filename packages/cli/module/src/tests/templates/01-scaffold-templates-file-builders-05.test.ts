import { describe, it, expect, serviceTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("serviceTemplate emits the service class", () => {
    const out = serviceTemplate("UserService");
    expect(out).toContain("export class UserService extends ModuleService");
  });
});
