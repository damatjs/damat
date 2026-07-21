import { describe, it, expect, envExampleTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("envExampleTemplate ships a DATABASE_URL line", () => {
    expect(envExampleTemplate("my-module")).toContain("my_module");
    expect(envExampleTemplate("ignored", "postgres://u:p@db/custom")).toContain(
      "postgres://u:p@db/custom",
    );
  });
});
