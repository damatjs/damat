import { createHash } from "node:crypto";
import { stableStringify } from "./stableStringify";

/**
 * Deterministic key for one read: namespace + model + method + a hash of the
 * (cache-stripped) arguments, with object keys sorted so `{a,b}` and `{b,a}`
 * address the same entry.
 */
export function buildCacheKey(
  prefix: string,
  modelName: string,
  method: string,
  args: unknown[],
): string {
  const hash = createHash("sha1").update(stableStringify(args)).digest("hex");
  return `${prefix}:${modelName}:${method}:${hash}`;
}
