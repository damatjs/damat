import type { CliLogContext, CliLogger } from "../types";

function details(context?: CliLogContext): [] | [CliLogContext] {
  return context ? [context] : [];
}

export function createDefaultLogger(): CliLogger {
  return {
    debug(message, context): void {
      console.debug(message, ...details(context));
    },
    info(message, context): void {
      console.log(message, ...details(context));
    },
    success(message, context): void {
      console.log(message, ...details(context));
    },
    skip(message, context): void {
      console.log(message, ...details(context));
    },
    warn(message, context): void {
      console.warn(message, ...details(context));
    },
    error(message, error, context): void {
      const args = [message, error, context].filter(
        (value) => value !== undefined,
      );
      console.error(...args);
    },
  };
}
