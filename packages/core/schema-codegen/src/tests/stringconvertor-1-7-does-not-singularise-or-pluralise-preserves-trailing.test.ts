import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("does not singularise or pluralise (preserves trailing s)", () => {
    expect(toPascalCase("users")).toBe("Users");
    expect(toPascalCase("classes")).toBe("Classes");
  });
});
