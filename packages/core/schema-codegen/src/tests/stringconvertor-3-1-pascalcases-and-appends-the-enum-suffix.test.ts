import { describe, it, expect } from "bun:test";
import { toEnumTypeName } from "../render/naming";

describe("toEnumTypeName", () => {
  it("PascalCases and appends the Enum suffix", () => {
    expect(toEnumTypeName("product_status")).toBe("ProductStatusEnum");
    expect(toEnumTypeName("orders")).toBe("OrdersEnum");
    expect(toEnumTypeName("role")).toBe("RoleEnum");
  });
});
