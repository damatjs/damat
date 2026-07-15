import { describe, expect, test } from "bun:test";
import { verifyIntegrity } from "../../index";

describe("verifyIntegrity", () => {
  test("accepts an exact match and rejects a mismatch", () => {
    expect(() => verifyIntegrity("sha256:a", "sha256:a")).not.toThrow();
    expect(() => verifyIntegrity("sha256:a", "sha256:b")).toThrow(
      "integrity mismatch",
    );
  });
});
