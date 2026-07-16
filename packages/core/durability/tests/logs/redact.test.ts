import { expect, test } from "bun:test";
import { redactValue } from "../../src";

test("redaction hides nested paths and matching keys without mutation", () => {
  const value = {
    authorization: "secret",
    user: { name: "Ada", credentials: { token: "abc" } },
  };
  const result = redactValue(value, {
    keys: ["authorization"],
    paths: ["user.credentials.token"],
  });
  expect(result).toEqual({
    authorization: "[REDACTED]",
    user: { name: "Ada", credentials: { token: "[REDACTED]" } },
  });
  expect(value.user.credentials.token).toBe("abc");
});
