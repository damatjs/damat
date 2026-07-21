import { describe, expect, test } from "bun:test";
import {
  assertPaymentProvider,
  isMoney,
  isPaymentPage,
  isPaymentRecord,
  isPaymentWebhookEvent,
  isRefundRecord,
} from "../src";

const service = {
  createPayment: async () => ({
    id: "payment",
    amount: 100,
    currency: "USD",
    status: "succeeded" as const,
    createdAt: new Date(),
  }),
  getPayment: async () => null,
  listPayments: async () => ({ data: [] }),
  capturePayment: async () => ({
    id: "payment",
    amount: 100,
    currency: "USD",
    status: "succeeded" as const,
    createdAt: new Date(),
  }),
  cancelPayment: async () => ({
    id: "payment",
    amount: 100,
    currency: "USD",
    status: "cancelled" as const,
    createdAt: new Date(),
  }),
  refundPayment: async () => ({
    id: "refund",
    paymentId: "payment",
    amount: 100,
    currency: "USD",
    status: "succeeded" as const,
    createdAt: new Date(),
  }),
  getRefund: async () => null,
  parseWebhook: async () => ({
    id: "event",
    type: "payment.updated",
    createdAt: new Date(),
    data: {},
  }),
};

describe("assertPaymentProvider", () => {
  test("accepts structural services and rejects role mismatches", () => {
    expect(() => assertPaymentProvider(service)).not.toThrow();
    expect(() =>
      assertPaymentProvider({ ...service, providerRole: "auth" }),
    ).toThrow('marked for "auth"');
  });
});

test("payment records enforce minor units, currencies, statuses, and dates", () => {
  const payment = {
    id: "payment",
    amount: 100,
    currency: "USD",
    status: "succeeded" as const,
    createdAt: new Date(),
  };
  const refund = {
    id: "refund",
    paymentId: "payment",
    amount: 100,
    currency: "USD",
    status: "succeeded" as const,
    createdAt: new Date(),
  };
  expect(isMoney(payment)).toBe(true);
  expect(isMoney({ amount: 1.5, currency: "usd" })).toBe(false);
  expect(isPaymentRecord(payment)).toBe(true);
  expect(isPaymentRecord({ ...payment, status: "unknown" })).toBe(false);
  expect(isPaymentRecord({ ...payment, updatedAt: "today" })).toBe(false);
  expect(isPaymentRecord({ ...payment, metadata: [] })).toBe(false);
  expect(isPaymentPage({ data: [payment], nextCursor: "next" })).toBe(true);
  expect(isPaymentPage({ data: [{}] })).toBe(false);
  expect(isRefundRecord(refund)).toBe(true);
  expect(isRefundRecord({ ...refund, paymentId: "" })).toBe(false);
  expect(isRefundRecord({ ...refund, reason: 1 })).toBe(false);
  expect(
    isPaymentWebhookEvent({
      id: "event",
      type: "payment.updated",
      createdAt: new Date(),
      data: {},
    }),
  ).toBe(true);
});
