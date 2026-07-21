import type { EnqueueJobOptions } from "../repositories";
import { validateNonBlank } from "./identifiers";
import { validateDelay } from "./numbers";
import { validateJobPolicies } from "./policies";

export function validateEnqueue(
  name: string,
  options: EnqueueJobOptions,
): void {
  validateNonBlank(name, "name");
  if (options.queue !== undefined) validateNonBlank(options.queue, "queue");
  if (options.deduplication) {
    validateNonBlank(options.deduplication.key, "deduplication key");
    const expiresAt = options.deduplication.expiresAt;
    if (
      expiresAt !== undefined &&
      (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()))
    ) {
      throw new RangeError("deduplication expiresAt must be a valid date");
    }
  }
  validateJobPolicies(options);
  if (options.delayMs !== undefined) validateDelay(options.delayMs);
}
