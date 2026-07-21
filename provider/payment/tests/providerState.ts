import type {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentInput,
  ListPaymentsInput,
  PaymentPage,
  PaymentRecord,
  RefundPaymentInput,
  RefundRecord,
} from "../src";

export class ProviderState {
  readonly payments = new Map<string, PaymentRecord>();
  readonly refunds = new Map<string, RefundRecord>();

  create(input: CreatePaymentInput): PaymentRecord {
    const payment: PaymentRecord = {
      ...input,
      id: `payment-${this.payments.size + 1}`,
      status: input.capture === false ? "authorized" : "succeeded",
      amountCaptured: input.capture === false ? 0 : input.amount,
      amountRefunded: 0,
      createdAt: new Date(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  list(input: ListPaymentsInput): PaymentPage {
    const data = [...this.payments.values()]
      .filter(
        (payment) =>
          !input.customerId || payment.customerId === input.customerId,
      )
      .filter((payment) => !input.status || payment.status === input.status)
      .slice(0, input.limit ?? 100);
    return { data };
  }

  capture(input: CapturePaymentInput): PaymentRecord {
    const payment = this.requiredPayment(input.paymentId);
    payment.status = "succeeded";
    payment.amountCaptured = input.amount ?? payment.amount;
    payment.updatedAt = new Date();
    return payment;
  }

  cancel(input: CancelPaymentInput): PaymentRecord {
    const payment = this.requiredPayment(input.paymentId);
    payment.status = "cancelled";
    payment.updatedAt = new Date();
    return payment;
  }

  refund(input: RefundPaymentInput): RefundRecord {
    const payment = this.requiredPayment(input.paymentId);
    const amount = input.amount ?? payment.amountCaptured ?? payment.amount;
    const refund: RefundRecord = {
      id: `refund-${this.refunds.size + 1}`,
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      status: "succeeded",
      createdAt: new Date(),
      ...(input.reason && { reason: input.reason }),
    };
    payment.amountRefunded = (payment.amountRefunded ?? 0) + amount;
    payment.status =
      payment.amountRefunded === payment.amount
        ? "refunded"
        : "partially-refunded";
    this.refunds.set(refund.id, refund);
    return refund;
  }

  requiredPayment(id: string): PaymentRecord {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Unknown payment");
    return payment;
  }
}
