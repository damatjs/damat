import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";

export function jobExecutor(executor?: DurabilityExecutor): DurabilityExecutor {
  return executor ?? getDurabilityClient();
}
