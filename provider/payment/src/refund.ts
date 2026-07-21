import type { Money } from "./payment";

export type RefundStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface RefundPaymentInput {
  paymentId: string;
  amount?: number;
  idempotencyKey: string;
  reason?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface RefundRecord extends Money {
  id: string;
  paymentId: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
  metadata?: Readonly<Record<string, unknown>>;
}
