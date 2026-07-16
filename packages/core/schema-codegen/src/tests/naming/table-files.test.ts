import { describe, it, expect } from "bun:test";
import { tableToFileName } from "../../generator/helpers";

{
  describe("tableToFileName", () => {
    it("converts snake_case to kebab-case", () => {
      expect(tableToFileName("order_item")).toBe("order-item");
      expect(tableToFileName("a_b_c")).toBe("a-b-c");
    });
  });
}

{
  describe("tableToFileName", () => {
    it("leaves a single-word name unchanged", () => {
      expect(tableToFileName("user")).toBe("user");
    });
  });
}

{
  describe("tableToFileName", () => {
    it("replaces every underscore", () => {
      expect(tableToFileName("very_long_table_name")).toBe(
        "very-long-table-name",
      );
    });
  });
}
