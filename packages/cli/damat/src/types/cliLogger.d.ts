import type { ILogger } from "@damatjs/logger";

declare module "@damatjs/cli" {
  interface CliLogger extends ILogger {}
}
