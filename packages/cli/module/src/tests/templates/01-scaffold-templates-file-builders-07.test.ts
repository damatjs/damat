import { describe, it, expect, envExampleTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("envExampleTemplate ships a DATABASE_URL line", () => {
    expect(envExampleTemplate()).toContain("DATABASE_URL=");
  });
});
