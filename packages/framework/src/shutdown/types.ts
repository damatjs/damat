export const SHUTDOWN_PHASES = [
  "http",
  "claims",
  "drain",
  "heartbeat",
  "redis",
  "postgres",
  "logger",
] as const;

export type ShutdownPhase = (typeof SHUTDOWN_PHASES)[number];

export interface ShutdownRegistration {
  name: string;
  phase: ShutdownPhase;
  handler: () => Promise<void> | void;
}

export interface ShutdownRunOptions {
  graceMs?: number;
}
