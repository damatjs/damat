import { describe, it, expect } from "bun:test";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("DEFAULT_AUTO_FIELDS", () => {
  it("is a Set instance", () => {
    expect(DEFAULT_AUTO_FIELDS instanceof Set).toBe(true);
  });
});
