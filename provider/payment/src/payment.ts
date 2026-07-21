export interface Money {
  /** Integer minor units, such as cents. */
  amount: number;
  /** Upper-case ISO 4217 code. */
  currency: string;
}

export type PaymentStatus =
  | "pending"
  | "requires-action"
  | "processing"
  | "authorized"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "partially-refunded"
  | "refunded";

export interface PaymentRecord extends Money {
  id: string;
  status: PaymentStatus;
  customerId?: string;
  paymentMethodId?: string;
  amountCaptured?: number;
  amountRefunded?: number;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface CreatePaymentInput extends Money {
  idempotencyKey: string;
  customerId?: string;
  paymentMethodId?: string;
  capture?: boolean;
  description?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ListPaymentsInput {
  customerId?: string;
  status?: PaymentStatus;
  cursor?: string;
  limit?: number;
}

export interface PaymentPage {
  data: readonly PaymentRecord[];
  nextCursor?: string;
}

export interface CapturePaymentInput {
  paymentId: string;
  idempotencyKey: string;
  amount?: number;
}

export interface CancelPaymentInput {
  paymentId: string;
  idempotencyKey: string;
  reason?: string;
}
