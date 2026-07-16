import { describe, it, expect } from "bun:test";
import { tableToFileName } from "../generator/helpers";

describe("tableToFileName", () => {
  it("converts snake_case to kebab-case", () => {
    expect(tableToFileName("order_item")).toBe("order-item");
    expect(tableToFileName("a_b_c")).toBe("a-b-c");
  });
});
