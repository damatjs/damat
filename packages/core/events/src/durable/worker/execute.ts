import { startEventDeliveryExecution } from "./execution";
import type {
  ClaimedEventDelivery,
  ExecuteEventDeliveryOptions,
} from "./types";

export async function executeEventDelivery(
  claim: ClaimedEventDelivery,
  options: ExecuteEventDeliveryOptions = {},
): Promise<void> {
  await startEventDeliveryExecution(claim, options).promise;
}

export { startEventDeliveryExecution } from "./execution";
export type { EventDeliveryExecution } from "./execution";
