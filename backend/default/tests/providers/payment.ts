import { PaymentProviderService } from "@damatjs/payment";
import { defineModule } from "@damatjs/services";

const Base = PaymentProviderService({ models: {} });
const payment = {
  id: "backend-payment",
  amount: 1000,
  currency: "USD",
  status: "succeeded" as const,
  createdAt: new Date(),
};

class BackendPaymentProvider extends Base {
  async createPayment() {
    return payment;
  }
  async getPayment(id: string) {
    return id === payment.id ? payment : null;
  }
  async listPayments() {
    return { data: [payment] };
  }
  async capturePayment() {
    return payment;
  }
  async cancelPayment() {
    return { ...payment, status: "cancelled" as const };
  }
  async refundPayment() {
    return {
      id: "backend-refund",
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: "succeeded" as const,
      createdAt: new Date(),
    };
  }
  async getRefund() {
    return null;
  }
  async parseWebhook() {
    return {
      id: "backend-event",
      type: "payment.updated",
      createdAt: new Date(),
      data: payment,
    };
  }
}

export default defineModule("test-payment", {
  service: BackendPaymentProvider,
  credentials: () => undefined,
});
