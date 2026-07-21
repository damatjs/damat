import type {
  AccelerationSignal,
  DurabilityCoordinator,
} from "@damatjs/durability";
import type { AccelerationRelayOperations } from "../../services/initialize/accelerationRelayOperations";

export const coordinator: DurabilityCoordinator = {
  mode: "healthy",
  setMode: () => {},
  pollInterval: (value) => value,
  run: (_key, operation) => operation(),
};

export const signal: AccelerationSignal = {
  id: crypto.randomUUID(),
  revision: "7",
  topic: "damat:jobs:wakeup",
  kind: "job",
  resourceId: "run",
  scope: "q",
  payload: {},
  availableAt: new Date(),
  claimToken: crypto.randomUUID(),
};

export function ops(
  overrides: Partial<AccelerationRelayOperations>,
): AccelerationRelayOperations {
  return {
    claim: async () => [],
    markPublished: async () => true,
    release: async () => {},
    updateState: async () => {},
    audit: async () => {},
    publish: async () => {},
    rebuild: async () => {},
    ...overrides,
  };
}
