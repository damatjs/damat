export interface PaymentCustomer {
  id: string;
  email?: string;
  name?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface UpsertPaymentCustomerInput {
  id?: string;
  idempotencyKey: string;
  email?: string;
  name?: string;
  metadata?: Readonly<Record<string, unknown>>;
}
