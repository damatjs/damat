import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { verifyArchiveIntegrity } from "../../integrity/archive";

const bytes = Buffer.from("archive");
const sha256 = createHash("sha256").update(bytes).digest("hex");

test("verifies hexadecimal SHA-256 archive integrity", () => {
  expect(() => verifyArchiveIntegrity(`sha256:${sha256}`, bytes)).not.toThrow();
  expect(() => verifyArchiveIntegrity("sha256:wrong", bytes)).toThrow(
    "integrity mismatch",
  );
});

test("rejects unsupported archive integrity formats", () => {
  expect(() => verifyArchiveIntegrity("md5-value", bytes)).toThrow(
    "unsupported integrity format",
  );
});
