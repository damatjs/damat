import type { Money, PaymentPage, PaymentRecord, PaymentStatus } from "./types";
import {
  nonEmpty,
  optionalDate,
  optionalInteger,
  optionalRecord,
  optionalString,
} from "./valueValidation";

const paymentStatuses: readonly PaymentStatus[] = [
  "pending",
  "requires-action",
  "processing",
  "authorized",
  "succeeded",
  "failed",
  "cancelled",
  "partially-refunded",
  "refunded",
];
export function isMoney(value: unknown): value is Money {
  const money = value as Partial<Money> | null;
  return Boolean(
    money &&
    Number.isSafeInteger(money.amount) &&
    Number(money.amount) >= 0 &&
    typeof money.currency === "string" &&
    /^[A-Z]{3}$/.test(money.currency),
  );
}

export function isPaymentRecord(value: unknown): value is PaymentRecord {
  if (!isMoney(value)) return false;
  const payment = value as Partial<PaymentRecord>;
  return (
    nonEmpty(payment.id) &&
    paymentStatuses.includes(payment.status as PaymentStatus) &&
    payment.createdAt instanceof Date &&
    optionalInteger(payment.amountCaptured) &&
    optionalInteger(payment.amountRefunded) &&
    optionalString(payment.customerId) &&
    optionalString(payment.paymentMethodId) &&
    optionalDate(payment.updatedAt) &&
    optionalRecord(payment.metadata)
  );
}

export function isPaymentPage(value: unknown): value is PaymentPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<PaymentPage>;
  return (
    Array.isArray(page.data) &&
    page.data.every(isPaymentRecord) &&
    (page.nextCursor === undefined || nonEmpty(page.nextCursor))
  );
}
