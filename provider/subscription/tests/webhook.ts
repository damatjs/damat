import type {
  SubscriptionWebhookEvent,
  SubscriptionWebhookInput,
} from "../src";

export function parseWebhook(
  input: SubscriptionWebhookInput,
  signature: string | undefined,
): SubscriptionWebhookEvent {
  if (input.headers["x-signature"] !== signature)
    throw new Error("Invalid webhook signature");
  const parsed = JSON.parse(new TextDecoder().decode(input.body));
  return {
    id: String(parsed.id),
    type: String(parsed.type),
    createdAt: new Date(String(parsed.createdAt)),
    data: parsed.data,
  };
}
