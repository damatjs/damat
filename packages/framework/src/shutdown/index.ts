import type { ShutdownHandler, Logger, ILogger } from "../types";

const handlers: ShutdownHandler[] = [];

export function registerShutdown(handler: ShutdownHandler): void {
  handlers.push(handler);
}

export function setupShutdownHandlers(logger: Logger | ILogger): void {
  process.on("SIGINT", () => shutdown("SIGINT", logger));
  process.on("SIGTERM", () => shutdown("SIGTERM", logger));
  process.on("uncaughtException", (err) => { logger.error("Uncaught", err); process.exit(1); });
  process.on("unhandledRejection", (r) => { logger.error("Unhandled", r instanceof Error ? r : undefined); process.exit(1); });
}

/** Runs every registered handler; failures are logged but never abort the drain. */
export async function runShutdownHandlers(logger: Logger | ILogger): Promise<void> {
  await Promise.all(handlers.map(async h => {
    try {
      await h.handler();
    } catch (err) {
      logger.error(`Shutdown handler "${h.name}" failed`, err instanceof Error ? err : new Error(String(err)));
    }
  }));
}

async function shutdown(signal: string, logger: Logger | ILogger): Promise<void> {
  logger.info(`Received ${signal}`);
  await runShutdownHandlers(logger);
  logger.info("Shutdown complete");
  if ('close' in logger && typeof logger.close === 'function') logger.close();
  process.exit(0);
}
