import { afterEach, expect, test } from "bun:test";
import { PoolManager } from "@damatjs/services";
import {
  assertPaymentProvider,
  isPaymentPage,
  isPaymentRecord,
  isPaymentWebhookEvent,
  isRefundRecord,
} from "../src";
import paymentModule, { FixturePaymentService } from "./providerModule";

afterEach(() => PoolManager.reset());

test("a payment provider module covers the complete payment lifecycle", async () => {
  setupPool();
  const initialized = paymentModule.init();
  expect(paymentModule.name).toBe("fixture-payment");
  expect(FixturePaymentService.providerRole).toBe("payment");
  expect(initialized.providerRole).toBe("payment");
  expect(initialized.credentials).toEqual({ apiKey: "fixture" });
  expect(initialized.getModels).toEqual([]);
  expect(
    await initialized.transaction(async () => initialized.providerRole),
  ).toBe("payment");
  expect(() => assertPaymentProvider(paymentModule.service)).not.toThrow();

  const payment = await paymentModule.service.createPayment({
    amount: 2500,
    currency: "USD",
    idempotencyKey: "create-1",
    capture: false,
  });
  expect(isPaymentRecord(payment)).toBe(true);
  expect(await paymentModule.service.getPayment(payment.id)).toBe(payment);
  expect(isPaymentPage(await paymentModule.service.listPayments({}))).toBe(
    true,
  );
  expect(
    isPaymentRecord(
      await paymentModule.service.capturePayment({
        paymentId: payment.id,
        idempotencyKey: "capture-1",
      }),
    ),
  ).toBe(true);
  const refund = await paymentModule.service.refundPayment({
    paymentId: payment.id,
    idempotencyKey: "refund-1",
  });
  expect(isRefundRecord(refund)).toBe(true);
  expect(isRefundRecord(await paymentModule.service.getRefund(refund.id))).toBe(
    true,
  );

  const cancellable = await paymentModule.service.createPayment({
    amount: 500,
    currency: "USD",
    idempotencyKey: "create-2",
    capture: false,
  });
  expect(
    (
      await paymentModule.service.cancelPayment({
        paymentId: cancellable.id,
        idempotencyKey: "cancel-1",
      })
    ).status,
  ).toBe("cancelled");

  const event = await paymentModule.service.parseWebhook({
    headers: { "x-signature": "fixture" },
    body: new TextEncoder().encode(
      JSON.stringify({
        id: "event-1",
        type: "payment.updated",
        createdAt: new Date(),
        data: {},
      }),
    ),
  });
  expect(isPaymentWebhookEvent(event)).toBe(true);
  expect(
    paymentModule.service.parseWebhook({ body: new Uint8Array(), headers: {} }),
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
