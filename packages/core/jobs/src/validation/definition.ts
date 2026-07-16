import type { JobOptions } from "../definitions/types";
import { validateNonBlank } from "./identifiers";
import { validateJobPolicies } from "./policies";

export function validateDefinition(name: string, options: JobOptions): void {
  validateNonBlank(name, "name");
  if (options.queue !== undefined) validateNonBlank(options.queue, "queue");
  validateJobPolicies(options);
}
