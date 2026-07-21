import { assertProviderRoleMatch } from "@damatjs/provider";
import type { PaymentProvider } from "./types";

const operations = [
  "createPayment",
  "getPayment",
  "listPayments",
  "capturePayment",
  "cancelPayment",
  "refundPayment",
  "getRefund",
  "parseWebhook",
] as const;

export function assertPaymentProvider(
  value: unknown,
): asserts value is PaymentProvider {
  if (!value || typeof value !== "object")
    throw new Error("Payment provider module service must be an object");
  assertProviderRoleMatch("payment", value);
  for (const operation of operations)
    if (typeof (value as PaymentProvider)[operation] !== "function")
      throw new Error(
        `Payment provider module service must implement ${operation}`,
      );
}
