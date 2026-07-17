import type { ILogger, Logger } from "../types";
import { runShutdownHandlers } from "./runner";
import type { ShutdownRunOptions } from "./types";

let installed = false;
let running: Promise<void> | undefined;

export function setupShutdownHandlers(
  logger: Logger | ILogger,
  options: ShutdownRunOptions = {},
): void {
  if (installed) return;
  installed = true;
  process.on("SIGINT", () => requestShutdown("SIGINT", logger, options));
  process.on("SIGTERM", () => requestShutdown("SIGTERM", logger, options));
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught", error);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled", reason instanceof Error ? reason : undefined);
    process.exit(1);
  });
}

export function resetShutdownSignalsForTests(): void {
  installed = false;
  running = undefined;
}

function requestShutdown(
  signal: string,
  logger: Logger | ILogger,
  options: ShutdownRunOptions,
): Promise<void> {
  if (running) return running;
  running = performShutdown(signal, logger, options);
  return running;
}

async function performShutdown(
  signal: string,
  logger: Logger | ILogger,
  options: ShutdownRunOptions,
): Promise<void> {
  logger.info(`Received ${signal}`);
  await runShutdownHandlers(logger, options);
  process.exit(0);
}
