import type { ILogger } from "@damatjs/logger";
import {
  SHUTDOWN_PHASES,
  type ShutdownRegistration,
  type ShutdownRunOptions,
} from "../shutdown";

function errorOf(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

async function runHandler(
  item: ShutdownRegistration,
  options: ShutdownRunOptions,
): Promise<void> {
  const task = Promise.resolve().then(item.handler);
  if (item.phase !== "drain" || options.graceMs === undefined) return task;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`Grace drain timed out after ${options.graceMs}ms`)),
      options.graceMs,
    );
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

export async function runServiceShutdownHandlers(
  handlers: readonly ShutdownRegistration[],
  logger: ILogger,
  options: ShutdownRunOptions = {},
): Promise<void> {
  for (const phase of SHUTDOWN_PHASES) {
    const selected = handlers.filter((item) => item.phase === phase);
    const results = await Promise.allSettled(
      selected.map((item) => runHandler(item, options)),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") return;
      const item = selected[index]!;
      logger.error(
        `Shutdown handler "${item.name}" failed in phase "${phase}": ${errorOf(result.reason).message}`,
      );
    });
  }
}
