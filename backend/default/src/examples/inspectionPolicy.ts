export const referenceInspectionPolicy = {
  inspectionVisibility: "metadata" as const,
  redaction: { keys: ["password", "token", "secret"] },
  retentionMs: 90 * 24 * 60 * 60 * 1_000,
  acceleration: {
    healthySafetyPollIntervalMs: 30_000,
    degradedMaxPollIntervalMs: 5_000,
    workerLivenessTtlMs: 10_000,
    durableWorkerSnapshotIntervalMs: 30_000,
    relayBatchSize: 100,
  },
};
