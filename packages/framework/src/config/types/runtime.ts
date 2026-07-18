export type RuntimeMode = "server" | "worker" | "all";
export type WorkerCapability = "jobs" | "events" | "pipelines";

export interface RuntimeConfig {
  mode?: RuntimeMode;
  workers?: WorkerCapability[];
  shutdownGraceMs?: number;
}
