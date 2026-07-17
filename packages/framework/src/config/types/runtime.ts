export type RuntimeMode = "server" | "worker" | "all";
export type WorkerCapability = "jobs" | "events";

export interface RuntimeConfig {
  mode?: RuntimeMode;
  workers?: WorkerCapability[];
  shutdownGraceMs?: number;
}
