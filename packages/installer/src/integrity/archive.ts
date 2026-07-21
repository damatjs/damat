import { createHash, timingSafeEqual } from "node:crypto";
import { hashBytes } from "./bytes";

function matches(left: string, right: string): boolean {
  const first = Buffer.from(left);
  const second = Buffer.from(right);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function verifyArchiveIntegrity(
  expected: string,
  bytes: Uint8Array,
): string {
  if (expected.startsWith("sha256:")) {
    const actual = hashBytes(bytes);
    if (!matches(expected, actual))
      throw new Error(
        `integrity mismatch: expected ${expected}, received ${actual}`,
      );
    return actual;
  }
  const match = /^(sha256|sha512)-(.+)$/.exec(expected);
  if (!match) throw new Error(`unsupported integrity format: ${expected}`);
  const algorithm = match[1]!;
  const actual = `${algorithm}-${createHash(algorithm).update(bytes).digest("base64")}`;
  if (!matches(expected, actual))
    throw new Error(
      `integrity mismatch: expected ${expected}, received ${actual}`,
    );
  return actual;
}
