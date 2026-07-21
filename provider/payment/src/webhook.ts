export interface PaymentWebhookInput {
  /** Unparsed bytes; signature verification must happen before payload parsing. */
  body: Uint8Array;
  headers: Readonly<Record<string, string>>;
}

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  createdAt: Date;
  data: unknown;
}
