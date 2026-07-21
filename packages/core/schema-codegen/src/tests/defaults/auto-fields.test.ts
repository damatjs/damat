import { DEFAULT_AUTO_FIELDS } from "../../defaults";
import { describe, it, expect } from "bun:test";

{
  describe("DEFAULT_AUTO_FIELDS", () => {
    it("contains expected auto fields", () => {
      expect(DEFAULT_AUTO_FIELDS.has("id")).toBe(true);
      expect(DEFAULT_AUTO_FIELDS.has("createdAt")).toBe(true);
      expect(DEFAULT_AUTO_FIELDS.has("created_at")).toBe(true);
      expect(DEFAULT_AUTO_FIELDS.has("updatedAt")).toBe(true);
      expect(DEFAULT_AUTO_FIELDS.has("updated_at")).toBe(true);
    });
  });
}

{
  describe("DEFAULT_AUTO_FIELDS", () => {
    it("does not contain other fields", () => {
      expect(DEFAULT_AUTO_FIELDS.has("name")).toBe(false);
      expect(DEFAULT_AUTO_FIELDS.has("email")).toBe(false);
    });
  });
}

{
  describe("DEFAULT_AUTO_FIELDS", () => {
    it("has exactly 5 default fields", () => {
      expect(DEFAULT_AUTO_FIELDS.size).toBe(5);
    });
  });
}

{
  describe("DEFAULT_AUTO_FIELDS", () => {
    it("is a Set instance", () => {
      expect(DEFAULT_AUTO_FIELDS instanceof Set).toBe(true);
    });
  });
}
