import { describe, it, expect } from "bun:test";
import { tableToFileName } from "../generator/helpers";

describe("tableToFileName", () => {
  it("replaces every underscore", () => {
    expect(tableToFileName("very_long_table_name")).toBe(
      "very-long-table-name",
    );
  });
});
