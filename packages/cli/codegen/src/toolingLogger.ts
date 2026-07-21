import type { CliLogger } from "@damatjs/cli";

export function asToolingLogger<T>(logger: CliLogger): T {
  return logger as T;
}
