import {
  updateAccelerationState,
  type AccelerationMode,
  type DurabilityCoordinator,
} from "@damatjs/durability";

export async function persistAccelerationMode(
  coordinator: DurabilityCoordinator,
  mode: AccelerationMode,
  persist: typeof updateAccelerationState = updateAccelerationState,
): Promise<void> {
  try {
    await persist({
      mode,
      fallbackPollIntervalMs: coordinator.pollInterval(5_000),
    });
  } catch {
    // State persistence must not interrupt degradation or shutdown.
  }
}
