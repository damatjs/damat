import type { JobOptions } from "../definitions/types";
import {
  validateInt32,
  validateMultiplier,
  validateSafeInteger,
} from "./numbers";

export function validateJobPolicies(options: JobOptions): void {
  if (options.priority !== undefined) {
    validateInt32(options.priority, "priority");
  }
  if (options.maxAttempts !== undefined) {
    validateInt32(options.maxAttempts, "maxAttempts", 1);
  }
  if (options.backoffMs !== undefined) {
    validateSafeInteger(options.backoffMs, "backoffMs", 0);
  }
  if (options.backoffMultiplier !== undefined) {
    validateMultiplier(options.backoffMultiplier);
  }
}
