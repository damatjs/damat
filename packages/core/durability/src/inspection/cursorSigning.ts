import { createHmac, timingSafeEqual } from "node:crypto";

export type CursorSigningKey = string | Uint8Array;

function validateKey(key: CursorSigningKey): void {
  const length = typeof key === "string" ? key.length : key.byteLength;
  if (length === 0) throw new Error("Cursor signing key cannot be empty");
}

export function signCursorPayload(
  payload: string,
  key: CursorSigningKey,
): string {
  validateKey(key);
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function verifyCursorSignature(
  payload: string,
  signature: string,
  key: CursorSigningKey,
): void {
  const expected = signCursorPayload(payload, key);
  const actualBytes = Buffer.from(signature, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  const canonical = actualBytes.toString("base64url") === signature;
  if (
    !canonical ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new Error("Invalid cursor signature");
  }
}
