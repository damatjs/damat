import type {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentInput,
  ListPaymentsInput,
  PaymentPage,
  PaymentRecord,
} from "./payment";
import type { RefundPaymentInput, RefundRecord } from "./refund";
import type { PaymentWebhookEvent, PaymentWebhookInput } from "./webhook";
import type { PaymentCustomer, UpsertPaymentCustomerInput } from "./customer";

export * from "./payment";
export * from "./refund";
export * from "./webhook";
export * from "./customer";

export interface PaymentProvider {
  readonly providerRole?: "payment";
  createPayment(input: CreatePaymentInput): Promise<PaymentRecord>;
  getPayment(id: string): Promise<PaymentRecord | null>;
  listPayments(input: ListPaymentsInput): Promise<PaymentPage>;
  capturePayment(input: CapturePaymentInput): Promise<PaymentRecord>;
  cancelPayment(input: CancelPaymentInput): Promise<PaymentRecord>;
  refundPayment(input: RefundPaymentInput): Promise<RefundRecord>;
  getRefund(id: string): Promise<RefundRecord | null>;
  parseWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookEvent>;
  upsertCustomer?(input: UpsertPaymentCustomerInput): Promise<PaymentCustomer>;
  getCustomer?(id: string): Promise<PaymentCustomer | null>;
}
