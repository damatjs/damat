import { assertProviderRoleMatch } from "@damatjs/provider";
import type {
  SubscriptionProvider,
  SubscriptionRecord,
  SubscriptionWebhookEvent,
} from "./types";

const operations = [
  "createSubscription",
  "getSubscription",
  "listSubscriptions",
  "changeSubscription",
  "cancelSubscription",
  "pauseSubscription",
  "resumeSubscription",
  "parseWebhook",
] as const;

const statuses = [
  "trialing",
  "active",
  "past-due",
  "paused",
  "cancelled",
  "ended",
] as const;

export function assertSubscriptionProvider(
  value: unknown,
): asserts value is SubscriptionProvider {
  if (!value || typeof value !== "object")
    throw new Error("Subscription provider module service must be an object");
  assertProviderRoleMatch("subscription", value);
  for (const operation of operations)
    if (typeof (value as SubscriptionProvider)[operation] !== "function")
      throw new Error(
        `Subscription provider module service must implement ${operation}`,
      );
}

export function isSubscriptionWebhookEvent(
  value: unknown,
): value is SubscriptionWebhookEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<SubscriptionWebhookEvent>;
  return (
    nonEmpty(event.id) &&
    nonEmpty(event.type) &&
    event.createdAt instanceof Date
  );
}

export function isSubscriptionRecord(
  value: unknown,
): value is SubscriptionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    nonEmpty(record.id) &&
    nonEmpty(record.customerId) &&
    nonEmpty(record.priceId) &&
    statuses.includes(record.status as (typeof statuses)[number]) &&
    Number.isSafeInteger(record.quantity) &&
    Number(record.quantity) > 0 &&
    record.createdAt instanceof Date &&
    optionalBoolean(record.cancelAtPeriodEnd) &&
    optionalDate(record.currentPeriodStart) &&
    optionalDate(record.currentPeriodEnd) &&
    optionalDate(record.updatedAt) &&
    optionalRecord(record.metadata)
  );
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalDate(value: unknown): boolean {
  return value === undefined || value instanceof Date;
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function optionalRecord(value: unknown): boolean {
  return (
    value === undefined ||
    (Boolean(value) && typeof value === "object" && !Array.isArray(value))
  );
}
