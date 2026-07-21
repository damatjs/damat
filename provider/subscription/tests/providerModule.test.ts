import { afterEach, expect, test } from "bun:test";
import { PoolManager } from "@damatjs/services";
import {
  assertSubscriptionProvider,
  isSubscriptionRecord,
  isSubscriptionWebhookEvent,
} from "../src";
import subscriptionModule, {
  FixtureSubscriptionService,
} from "./providerModule";

afterEach(() => PoolManager.reset());

test("a subscription provider module covers the complete lifecycle", async () => {
  setupPool();
  const initialized = subscriptionModule.init();
  expect(FixtureSubscriptionService.providerRole).toBe("subscription");
  expect(initialized.providerRole).toBe("subscription");
  expect(initialized.credentials).toEqual({ apiKey: "fixture" });
  expect(initialized.getModels).toEqual([]);
  expect(
    await initialized.transaction(async () => initialized.providerRole),
  ).toBe("subscription");
  expect(() =>
    assertSubscriptionProvider(subscriptionModule.service),
  ).not.toThrow();

  const created = await subscriptionModule.service.createSubscription({
    customerId: "customer-1",
    priceId: "starter",
    idempotencyKey: "create-1",
  });
  expect(isSubscriptionRecord(created)).toBe(true);
  expect(
    isSubscriptionRecord(
      await subscriptionModule.service.getSubscription(created.id),
    ),
  ).toBe(true);
  expect(
    (
      await subscriptionModule.service.listSubscriptions({
        customerId: "customer-1",
      })
    ).data,
  ).toHaveLength(1);
  const changed = await subscriptionModule.service.changeSubscription({
    subscriptionId: created.id,
    priceId: "growth",
    idempotencyKey: "change-1",
  });
  expect(changed.priceId).toBe("growth");
  const paused = await subscriptionModule.service.pauseSubscription({
    subscriptionId: created.id,
    idempotencyKey: "pause-1",
  });
  expect(paused.status).toBe("paused");
  const resumed = await subscriptionModule.service.resumeSubscription({
    subscriptionId: created.id,
    idempotencyKey: "resume-1",
  });
  expect(resumed.status).toBe("active");
  const cancelled = await subscriptionModule.service.cancelSubscription({
    subscriptionId: created.id,
    idempotencyKey: "cancel-1",
  });
  expect(cancelled.status).toBe("cancelled");
  const event = await subscriptionModule.service.parseWebhook({
    headers: { "x-signature": "fixture" },
    body: new TextEncoder().encode(
      JSON.stringify({
        id: "event-1",
        type: "subscription.updated",
        createdAt: new Date(),
        data: {},
      }),
    ),
  });
  expect(isSubscriptionWebhookEvent(event)).toBe(true);
  expect(
    subscriptionModule.service.parseWebhook({
      body: new Uint8Array(),
      headers: {},
    }),
  ).rejects.toThrow("Invalid webhook signature");
});

function setupPool(): void {
  PoolManager.setup({
    pool: {} as never,
    logger: {} as never,
    connectionManager: {} as never,
  });
  PoolManager.setEntityManager(transactionManager() as never);
}

function transactionManager() {
  return {
    transaction: async (run: (executor: object) => Promise<unknown>) => run({}),
  };
}
