import { describe, expect, test } from "bun:test";
import { matchGlob } from "../../index";

describe("matchGlob", () => {
  test.each([
    ["src/a.ts", "src/*.ts", true],
    ["src/nested/a.ts", "src/*.ts", false],
    ["src/nested/a.ts", "src/**", true],
    ["src/a.ts", "src/?.ts", true],
    ["src/ab.ts", "src/?.ts", false],
  ])("matches %s against %s", (path, pattern, expected) => {
    expect(matchGlob(path, pattern)).toBe(expected);
  });

  test("treats regex punctuation literally", () => {
    expect(matchGlob("src/a.test.ts", "src/*.test.ts")).toBeTrue();
    expect(matchGlob("src/atest.ts", "src/*.test.ts")).toBeFalse();
  });
});
