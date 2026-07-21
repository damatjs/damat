import { expect, test } from "bun:test";
import { createLeaseToken } from "../../src";

test("lease tokens are unique UUIDs", () => {
  const first = createLeaseToken();
  const second = createLeaseToken();
  expect(first).not.toBe(second);
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
});
