import type { RuntimeMode, WorkerCapability } from "../config/types/runtime";

export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export interface RuntimeOverrides {
  mode?: RuntimeMode;
  workers?: WorkerCapability[];
}

export interface ResolvedRuntime {
  mode: RuntimeMode;
  workers: WorkerCapability[];
  servesHttp: boolean;
}
