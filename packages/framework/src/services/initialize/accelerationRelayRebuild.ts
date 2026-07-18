import type {
  AccelerationActor,
  DurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import type { AccelerationRelayOperations } from "./accelerationRelayOperations";

export async function rebuildAccelerationRelay(
  operations: AccelerationRelayOperations,
  redis: Redis,
  enabled: { jobs: boolean; events: boolean; pipelines?: boolean },
  coordinator: DurabilityCoordinator,
  actor: AccelerationActor,
): Promise<void> {
  await coordinator.run("acceleration:rebuild", async () => {
    await operations.audit(actor, "requested");
    try {
      await operations.rebuild(redis, enabled);
      await operations.updateState({
        mode: "healthy",
        fallbackPollIntervalMs: 5_000,
        rebuilt: true,
      });
      await operations.audit(actor, "completed");
    } catch (error) {
      await operations.audit(actor, "failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
