import type { ShutdownPhase, ShutdownRegistration } from "./types";

const handlers: ShutdownRegistration[] = [];

export function registerShutdown(handler: ShutdownRegistration): void {
  handlers.push(handler);
}

export function getShutdownHandlers(
  phase: ShutdownPhase,
): ShutdownRegistration[] {
  return handlers.filter((handler) => handler.phase === phase);
}

export function resetShutdownRegistry(): void {
  handlers.length = 0;
}
