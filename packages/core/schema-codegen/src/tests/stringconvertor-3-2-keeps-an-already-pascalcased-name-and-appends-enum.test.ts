import { describe, it, expect } from "bun:test";
import { toEnumTypeName } from "../render/naming";

describe("toEnumTypeName", () => {
  it("keeps an already-PascalCased name and appends Enum", () => {
    expect(toEnumTypeName("ProductStatus")).toBe("ProductStatusEnum");
  });
});
