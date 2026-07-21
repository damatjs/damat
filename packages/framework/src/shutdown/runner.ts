import type { ILogger, Logger } from "../types";
import { getShutdownHandlers } from "./registry";
import {
  SHUTDOWN_PHASES,
  type ShutdownRegistration,
  type ShutdownRunOptions,
} from "./types";

export async function runShutdownHandlers(
  logger: Logger | ILogger,
  options: ShutdownRunOptions = {},
): Promise<void> {
  for (const phase of SHUTDOWN_PHASES) {
    if (phase === "logger") logger.info("Shutdown complete");
    const handlers = getShutdownHandlers(phase);
    const results = await Promise.allSettled(
      handlers.map((item) => runHandler(item, options)),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") return;
      const handler = handlers[index]!;
      const error = asError(result.reason);
      logger.error(
        `Shutdown handler "${handler.name}" failed in phase "${phase}": ${error.message}`,
        error,
      );
    });
  }
}

function runHandler(
  registration: ShutdownRegistration,
  options: ShutdownRunOptions,
): Promise<void> {
  const task = Promise.resolve().then(registration.handler);
  if (registration.phase !== "drain" || options.graceMs === undefined) {
    return task;
  }
  return withTimeout(task, options.graceMs);
}

function withTimeout(task: Promise<void>, graceMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Grace drain timed out after ${graceMs}ms`)),
      graceMs,
    );
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

function asError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}
