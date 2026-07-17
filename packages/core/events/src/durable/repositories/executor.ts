import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";

export function eventExecutor(
  executor?: DurabilityExecutor,
): DurabilityExecutor {
  return executor ?? getDurabilityClient();
}
