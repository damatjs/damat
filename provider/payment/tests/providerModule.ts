import { z } from "@damatjs/deps/zod";
import { defineModule } from "@damatjs/services";
import {
  PaymentProviderService,
  type CancelPaymentInput,
  type CapturePaymentInput,
  type CreatePaymentInput,
  type ListPaymentsInput,
  type PaymentWebhookInput,
  type RefundPaymentInput,
} from "../src";
import { ProviderState } from "./providerState";

const Base = PaymentProviderService({
  models: {},
  credentialsSchema: z.object({ apiKey: z.string().min(1) }),
});

export class FixturePaymentService extends Base {
  private readonly state = new ProviderState();

  async createPayment(input: CreatePaymentInput) {
    return this.state.create(input);
  }
  async getPayment(id: string) {
    return this.state.payments.get(id) ?? null;
  }
  async listPayments(input: ListPaymentsInput) {
    return this.state.list(input);
  }
  async capturePayment(input: CapturePaymentInput) {
    return this.state.capture(input);
  }
  async cancelPayment(input: CancelPaymentInput) {
    return this.state.cancel(input);
  }
  async refundPayment(input: RefundPaymentInput) {
    return this.state.refund(input);
  }
  async getRefund(id: string) {
    return this.state.refunds.get(id) ?? null;
  }
  async parseWebhook(input: PaymentWebhookInput) {
    if (input.headers["x-signature"] !== this.credentials?.apiKey)
      throw new Error("Invalid webhook signature");
    const parsed = JSON.parse(new TextDecoder().decode(input.body));
    return {
      id: String(parsed.id),
      type: String(parsed.type),
      createdAt: new Date(String(parsed.createdAt)),
      data: parsed.data,
    };
  }
}

export default defineModule("fixture-payment", {
  service: FixturePaymentService,
  credentials: () => ({ apiKey: "fixture" }),
});
