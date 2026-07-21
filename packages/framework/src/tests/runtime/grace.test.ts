import { expect, test } from "bun:test";
import { resolveShutdownGraceMs } from "../../runtime";

test("shutdown grace accepts worker timer bounds", () => {
  expect(resolveShutdownGraceMs(undefined)).toBeUndefined();
  expect(resolveShutdownGraceMs(0)).toBe(0);
  expect(resolveShutdownGraceMs(2_147_483_647)).toBe(2_147_483_647);
});

test("shutdown grace rejects unsafe timer values", () => {
  for (const value of [-1, Infinity, Number.NaN, 2_147_483_648]) {
    expect(() => resolveShutdownGraceMs(value)).toThrow(
      "shutdownGraceMs must be between 0 and 2147483647",
    );
  }
});
