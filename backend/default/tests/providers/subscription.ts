import { SubscriptionProviderService } from "@damatjs/subscription";
import { defineModule } from "@damatjs/services";

const Base = SubscriptionProviderService({ models: {} });
const subscription = {
  id: "backend-subscription",
  customerId: "backend-customer",
  priceId: "backend-price",
  status: "active" as const,
  quantity: 1,
  createdAt: new Date(),
};

class BackendSubscriptionProvider extends Base {
  async createSubscription() {
    return subscription;
  }
  async getSubscription(id: string) {
    return id === subscription.id ? subscription : null;
  }
  async listSubscriptions() {
    return { data: [subscription] };
  }
  async changeSubscription() {
    return { ...subscription, priceId: "backend-price-2" };
  }
  async cancelSubscription() {
    return { ...subscription, status: "cancelled" as const };
  }
  async pauseSubscription() {
    return { ...subscription, status: "paused" as const };
  }
  async resumeSubscription() {
    return subscription;
  }
  async parseWebhook() {
    return {
      id: "backend-subscription-event",
      type: "subscription.updated",
      createdAt: new Date(),
      data: subscription,
    };
  }
}

export default defineModule("test-subscription", {
  service: BackendSubscriptionProvider,
  credentials: () => undefined,
});
