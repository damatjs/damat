import type { RetentionDuration } from "@damatjs/durability";

const KEY = Symbol.for("damatjs.pipelines.settings");
interface PipelineSettings {
  retentionMs: RetentionDuration;
  jobs: boolean;
  events: boolean;
}
type Storage = typeof globalThis & { [KEY]?: PipelineSettings };
const storage = () => globalThis as Storage;

export function configurePipelineDefaults(options: {
  retentionMs?: RetentionDuration;
  jobs?: boolean;
  events?: boolean;
}): void {
  const retentionMs = options.retentionMs ?? 90 * 24 * 60 * 60 * 1_000;
  if (
    retentionMs !== "forever" &&
    (!Number.isSafeInteger(retentionMs) || retentionMs < 0)
  ) {
    throw new Error(
      "pipeline retentionMs must be a nonnegative safe integer or forever",
    );
  }
  storage()[KEY] = {
    retentionMs,
    jobs: options.jobs ?? true,
    events: options.events ?? true,
  };
}

export const getPipelineDefaultRetention = (): RetentionDuration =>
  storage()[KEY]?.retentionMs ?? 90 * 24 * 60 * 60 * 1_000;
export const getPipelineRuntimeSupport = () => ({
  jobs: storage()[KEY]?.jobs ?? true,
  events: storage()[KEY]?.events ?? true,
});
export const clearPipelineDefaults = () => {
  delete storage()[KEY];
};
