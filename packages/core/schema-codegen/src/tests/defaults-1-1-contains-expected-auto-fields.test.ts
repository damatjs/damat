import { describe, it, expect } from "bun:test";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("DEFAULT_AUTO_FIELDS", () => {
  it("contains expected auto fields", () => {
    expect(DEFAULT_AUTO_FIELDS.has("id")).toBe(true);
    expect(DEFAULT_AUTO_FIELDS.has("createdAt")).toBe(true);
    expect(DEFAULT_AUTO_FIELDS.has("created_at")).toBe(true);
    expect(DEFAULT_AUTO_FIELDS.has("updatedAt")).toBe(true);
    expect(DEFAULT_AUTO_FIELDS.has("updated_at")).toBe(true);
  });
});
