import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("returns empty array for no relations", () => {
    expect(relationFields([])).toEqual([]);
  });
});
