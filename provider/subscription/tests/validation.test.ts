import { describe, expect, test } from "bun:test";
import {
  assertSubscriptionProvider,
  isSubscriptionRecord,
  isSubscriptionWebhookEvent,
} from "../src";

const service = {
  createSubscription: async () => ({
    id: "subscription",
    customerId: "customer",
    priceId: "price",
    status: "active" as const,
    quantity: 1,
    createdAt: new Date(),
  }),
  getSubscription: async () => null,
  listSubscriptions: async () => ({ data: [] }),
  changeSubscription: async () => ({
    id: "subscription",
    customerId: "customer",
    priceId: "new-price",
    status: "active" as const,
    quantity: 1,
    createdAt: new Date(),
  }),
  cancelSubscription: async () => ({
    id: "subscription",
    customerId: "customer",
    priceId: "price",
    status: "cancelled" as const,
    quantity: 1,
    createdAt: new Date(),
  }),
  pauseSubscription: async () => ({
    id: "subscription",
    customerId: "customer",
    priceId: "price",
    status: "paused" as const,
    quantity: 1,
    createdAt: new Date(),
  }),
  resumeSubscription: async () => ({
    id: "subscription",
    customerId: "customer",
    priceId: "price",
    status: "active" as const,
    quantity: 1,
    createdAt: new Date(),
  }),
  parseWebhook: async () => ({
    id: "event",
    type: "subscription.updated",
    createdAt: new Date(),
    data: {},
  }),
};

describe("assertSubscriptionProvider", () => {
  test("accepts structural services and rejects role mismatches", () => {
    expect(() => assertSubscriptionProvider(service)).not.toThrow();
    expect(() =>
      assertSubscriptionProvider({ ...service, providerRole: "payment" }),
    ).toThrow('marked for "payment"');
  });
});

test("subscription records reject invalid lifecycle values", () => {
  const record = {
    id: "subscription",
    customerId: "customer",
    priceId: "price",
    status: "active",
    quantity: 1,
    createdAt: new Date(),
  };
  expect(isSubscriptionRecord(record)).toBe(true);
  expect(isSubscriptionRecord({ ...record, quantity: 0 })).toBe(false);
  expect(isSubscriptionRecord({ ...record, status: "unknown" })).toBe(false);
  expect(isSubscriptionRecord({ ...record, createdAt: "today" })).toBe(false);
  expect(isSubscriptionRecord({ ...record, cancelAtPeriodEnd: "yes" })).toBe(
    false,
  );
  expect(isSubscriptionRecord({ ...record, metadata: [] })).toBe(false);
  expect(
    isSubscriptionWebhookEvent({
      id: "event",
      type: "subscription.updated",
      createdAt: new Date(),
      data: {},
    }),
  ).toBe(true);
  expect(isSubscriptionWebhookEvent({ id: "", type: "event" })).toBe(false);
});
