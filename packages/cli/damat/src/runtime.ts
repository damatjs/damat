import type { CliRuntime } from "@damatjs/cli";
import { Logger } from "@damatjs/logger";

export function createDamatRuntime(): CliRuntime {
  return {
    args: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env,
    logger: new Logger({ timestamp: false }),
    output: {
      write(message = "") {
        console.log(message);
      },
    },
  };
}
