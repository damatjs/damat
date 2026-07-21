import type { z } from "@damatjs/deps/zod";
import {
  ProviderService,
  type ProviderServiceInstance,
  type ServiceCredentials,
} from "@damatjs/provider";
import type { ModelsMap, ModuleServiceConfig } from "@damatjs/services";
import type {
  CancelSubscriptionInput,
  ChangeSubscriptionInput,
  CreateSubscriptionInput,
  ListSubscriptionsInput,
  PauseSubscriptionInput,
  ResumeSubscriptionInput,
  SubscriptionPage,
  SubscriptionProvider,
  SubscriptionRecord,
  SubscriptionWebhookEvent,
  SubscriptionWebhookInput,
} from "./types";

type SubscriptionServiceInstance<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = ProviderServiceInstance<TModels, TSchema, "subscription"> &
  SubscriptionProvider;

export type SubscriptionProviderServiceConstructor<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = (abstract new (
  credentials?: ServiceCredentials<TSchema>,
) => SubscriptionServiceInstance<TModels, TSchema>) & {
  readonly providerRole: "subscription";
};

export function SubscriptionProviderService<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  config: ModuleServiceConfig<TModels, TSchema>,
): SubscriptionProviderServiceConstructor<TModels, TSchema> {
  const Base = ProviderService({
    ...config,
    role: "subscription" as const,
  }) as unknown as abstract new (credentials?: unknown) => object;
  abstract class GeneratedSubscriptionProviderService extends Base {
    abstract createSubscription(
      input: CreateSubscriptionInput,
    ): Promise<SubscriptionRecord>;
    abstract getSubscription(id: string): Promise<SubscriptionRecord | null>;
    abstract listSubscriptions(
      input: ListSubscriptionsInput,
    ): Promise<SubscriptionPage>;
    abstract changeSubscription(
      input: ChangeSubscriptionInput,
    ): Promise<SubscriptionRecord>;
    abstract cancelSubscription(
      input: CancelSubscriptionInput,
    ): Promise<SubscriptionRecord>;
    abstract pauseSubscription(
      input: PauseSubscriptionInput,
    ): Promise<SubscriptionRecord>;
    abstract resumeSubscription(
      input: ResumeSubscriptionInput,
    ): Promise<SubscriptionRecord>;
    abstract parseWebhook(
      input: SubscriptionWebhookInput,
    ): Promise<SubscriptionWebhookEvent>;
  }
  return GeneratedSubscriptionProviderService as unknown as SubscriptionProviderServiceConstructor<
    TModels,
    TSchema
  >;
}
