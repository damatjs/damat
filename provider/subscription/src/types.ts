export type SubscriptionStatus =
  "trialing" | "active" | "past-due" | "paused" | "cancelled" | "ended";

export interface SubscriptionRecord {
  id: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  quantity: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  priceId: string;
  idempotencyKey: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ListSubscriptionsInput {
  customerId?: string;
  status?: SubscriptionStatus;
  cursor?: string;
  limit?: number;
}

export interface SubscriptionPage {
  data: readonly SubscriptionRecord[];
  nextCursor?: string;
}

export interface ChangeSubscriptionInput {
  subscriptionId: string;
  priceId: string;
  idempotencyKey: string;
  quantity?: number;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  idempotencyKey: string;
  atPeriodEnd?: boolean;
}

export interface PauseSubscriptionInput {
  subscriptionId: string;
  idempotencyKey: string;
  resumeAt?: Date;
}

export interface ResumeSubscriptionInput {
  subscriptionId: string;
  idempotencyKey: string;
}

export interface SubscriptionWebhookInput {
  /** Unparsed bytes; signature verification must happen before payload parsing. */
  body: Uint8Array;
  headers: Readonly<Record<string, string>>;
}

export interface SubscriptionWebhookEvent {
  id: string;
  type: string;
  createdAt: Date;
  data: unknown;
}

export interface SubscriptionProvider {
  readonly providerRole?: "subscription";
  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionRecord>;
  getSubscription(id: string): Promise<SubscriptionRecord | null>;
  listSubscriptions(input: ListSubscriptionsInput): Promise<SubscriptionPage>;
  changeSubscription(
    input: ChangeSubscriptionInput,
  ): Promise<SubscriptionRecord>;
  cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<SubscriptionRecord>;
  pauseSubscription(input: PauseSubscriptionInput): Promise<SubscriptionRecord>;
  resumeSubscription(
    input: ResumeSubscriptionInput,
  ): Promise<SubscriptionRecord>;
  parseWebhook(
    input: SubscriptionWebhookInput,
  ): Promise<SubscriptionWebhookEvent>;
}
