import { describe, it, expect } from "bun:test";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("DEFAULT_AUTO_FIELDS", () => {
  it("has exactly 5 default fields", () => {
    expect(DEFAULT_AUTO_FIELDS.size).toBe(5);
  });
});
