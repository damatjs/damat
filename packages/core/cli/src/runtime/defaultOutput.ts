import type { CliOutput } from "../types";

export function createDefaultOutput(): CliOutput {
  return {
    write(message = ""): void {
      console.log(message);
    },
  };
}
