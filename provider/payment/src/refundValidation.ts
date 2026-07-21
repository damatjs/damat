import type { PaymentWebhookEvent, RefundRecord, RefundStatus } from "./types";
import { isMoney } from "./recordValidation";
import { nonEmpty, optionalRecord, optionalString } from "./valueValidation";

const refundStatuses: readonly RefundStatus[] = [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
];

export function isRefundRecord(value: unknown): value is RefundRecord {
  if (!isMoney(value)) return false;
  const refund = value as Partial<RefundRecord>;
  return (
    nonEmpty(refund.id) &&
    nonEmpty(refund.paymentId) &&
    refundStatuses.includes(refund.status as RefundStatus) &&
    refund.createdAt instanceof Date &&
    optionalString(refund.reason) &&
    optionalRecord(refund.metadata)
  );
}

export function isPaymentWebhookEvent(
  value: unknown,
): value is PaymentWebhookEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<PaymentWebhookEvent>;
  return (
    nonEmpty(event.id) &&
    nonEmpty(event.type) &&
    event.createdAt instanceof Date
  );
}
