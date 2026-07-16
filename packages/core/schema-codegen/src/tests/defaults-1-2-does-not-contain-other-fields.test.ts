import { describe, it, expect } from "bun:test";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("DEFAULT_AUTO_FIELDS", () => {
  it("does not contain other fields", () => {
    expect(DEFAULT_AUTO_FIELDS.has("name")).toBe(false);
    expect(DEFAULT_AUTO_FIELDS.has("email")).toBe(false);
  });
});
