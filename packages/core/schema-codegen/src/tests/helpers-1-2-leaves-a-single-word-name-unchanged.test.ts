import { describe, it, expect } from "bun:test";
import { tableToFileName } from "../generator/helpers";

describe("tableToFileName", () => {
  it("leaves a single-word name unchanged", () => {
    expect(tableToFileName("user")).toBe("user");
  });
});
