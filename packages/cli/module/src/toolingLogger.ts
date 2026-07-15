import type { CliLogger } from "@damatjs/cli";

/**
 * Legacy tooling accepts the larger Damat logger type but only calls methods
 * present on CliLogger. Keep that compatibility cast at this package boundary.
 */
export function asToolingLogger<T>(logger: CliLogger): T {
  return logger as T;
}
