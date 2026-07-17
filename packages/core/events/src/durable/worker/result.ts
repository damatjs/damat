import type { JsonValue } from "@damatjs/durability";

export function normalizeEventDeliveryResult(
  value: unknown,
): JsonValue | undefined {
  if (value === undefined) return undefined;
  assertJson(value, new Set());
  return value as JsonValue;
}

function assertJson(value: unknown, seen: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || seen.has(value)) throw resultError();
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype
  )
    throw resultError();
  seen.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    assertJson(child, seen);
  }
  seen.delete(value);
}

const resultError = () =>
  new TypeError("Durable event delivery results must be JSON-safe values");
