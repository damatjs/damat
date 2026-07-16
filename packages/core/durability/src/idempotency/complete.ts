import type { DurabilityExecutor } from "../client/types";
import type { JsonValue } from "./types";

export async function completeIdempotency<T extends JsonValue>(
  executor: DurabilityExecutor,
  scope: string,
  key: string,
  value: T,
): Promise<void> {
  assertJsonValue(value);
  await executor.query(
    `UPDATE "_damat_idempotency_keys"
     SET "status" = 'completed', "result" = $3::jsonb,
       "completed_at" = NOW()
     WHERE "scope" = $1 AND "key" = $2 AND "status" = 'running'`,
    [scope, key, JSON.stringify(value)],
  );
}

function assertJsonValue(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") throw jsonError();
  if (seen.has(value)) throw jsonError();
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) assertJsonValue(item, seen);
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype) throw jsonError();
    for (const item of Object.values(value)) assertJsonValue(item, seen);
  }
  seen.delete(value);
}

function jsonError(): TypeError {
  return new TypeError("Idempotency results must be JSON-safe values");
}
