import { z } from "@damatjs/deps/zod";
import { defineModule } from "@damatjs/services";
import {
  SubscriptionProviderService,
  type CancelSubscriptionInput,
  type ChangeSubscriptionInput,
  type CreateSubscriptionInput,
  type ListSubscriptionsInput,
  type PauseSubscriptionInput,
  type ResumeSubscriptionInput,
  type SubscriptionRecord,
  type SubscriptionWebhookInput,
} from "../src";
import { parseWebhook } from "./webhook";

const Base = SubscriptionProviderService({
  models: {},
  credentialsSchema: z.object({ apiKey: z.string().min(1) }),
});

export class FixtureSubscriptionService extends Base {
  private readonly records = new Map<string, SubscriptionRecord>();

  async createSubscription(input: CreateSubscriptionInput) {
    const record: SubscriptionRecord = {
      id: `subscription-${this.records.size + 1}`,
      customerId: input.customerId,
      priceId: input.priceId,
      quantity: input.quantity ?? 1,
      status: input.trialDays ? "trialing" : "active",
      createdAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async getSubscription(id: string) {
    return this.records.get(id) ?? null;
  }

  async listSubscriptions(input: ListSubscriptionsInput) {
    const data = [...this.records.values()]
      .filter(
        (record) => !input.customerId || record.customerId === input.customerId,
      )
      .filter((record) => !input.status || record.status === input.status)
      .slice(0, input.limit ?? 100);
    return { data };
  }

  async changeSubscription(input: ChangeSubscriptionInput) {
    const record = this.required(input.subscriptionId);
    record.priceId = input.priceId;
    record.quantity = input.quantity ?? record.quantity;
    record.updatedAt = new Date();
    return record;
  }

  async cancelSubscription(input: CancelSubscriptionInput) {
    const record = this.required(input.subscriptionId);
    record.cancelAtPeriodEnd = input.atPeriodEnd ?? false;
    if (!input.atPeriodEnd) record.status = "cancelled";
    record.updatedAt = new Date();
    return record;
  }

  async pauseSubscription(input: PauseSubscriptionInput) {
    const record = this.required(input.subscriptionId);
    record.status = "paused";
    record.updatedAt = new Date();
    return record;
  }

  async resumeSubscription(input: ResumeSubscriptionInput) {
    const record = this.required(input.subscriptionId);
    record.status = "active";
    record.cancelAtPeriodEnd = false;
    record.updatedAt = new Date();
    return record;
  }

  async parseWebhook(input: SubscriptionWebhookInput) {
    return parseWebhook(input, this.credentials?.apiKey);
  }

  private required(id: string): SubscriptionRecord {
    const record = this.records.get(id);
    if (!record) throw new Error("Unknown subscription");
    return record;
  }
}

export default defineModule("fixture-subscription", {
  service: FixtureSubscriptionService,
  credentials: () => ({ apiKey: "fixture" }),
});
