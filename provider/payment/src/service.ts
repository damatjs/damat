import type { z } from "@damatjs/deps/zod";
import {
  ProviderService,
  type ProviderServiceInstance,
  type ServiceCredentials,
} from "@damatjs/provider";
import type { ModelsMap, ModuleServiceConfig } from "@damatjs/services";
import type {
  CancelPaymentInput,
  CapturePaymentInput,
  CreatePaymentInput,
  ListPaymentsInput,
  PaymentPage,
  PaymentProvider,
  PaymentRecord,
  RefundPaymentInput,
  RefundRecord,
  PaymentWebhookEvent,
  PaymentWebhookInput,
} from "./types";

type PaymentServiceInstance<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = ProviderServiceInstance<TModels, TSchema, "payment"> & PaymentProvider;

export type PaymentProviderServiceConstructor<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = (abstract new (
  credentials?: ServiceCredentials<TSchema>,
) => PaymentServiceInstance<TModels, TSchema>) & {
  readonly providerRole: "payment";
};

export function PaymentProviderService<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  config: ModuleServiceConfig<TModels, TSchema>,
): PaymentProviderServiceConstructor<TModels, TSchema> {
  const Base = ProviderService({
    ...config,
    role: "payment" as const,
  }) as unknown as abstract new (credentials?: unknown) => object;
  abstract class GeneratedPaymentProviderService extends Base {
    abstract createPayment(input: CreatePaymentInput): Promise<PaymentRecord>;
    abstract getPayment(id: string): Promise<PaymentRecord | null>;
    abstract listPayments(input: ListPaymentsInput): Promise<PaymentPage>;
    abstract capturePayment(input: CapturePaymentInput): Promise<PaymentRecord>;
    abstract cancelPayment(input: CancelPaymentInput): Promise<PaymentRecord>;
    abstract refundPayment(input: RefundPaymentInput): Promise<RefundRecord>;
    abstract getRefund(id: string): Promise<RefundRecord | null>;
    abstract parseWebhook(
      input: PaymentWebhookInput,
    ): Promise<PaymentWebhookEvent>;
  }
  return GeneratedPaymentProviderService as unknown as PaymentProviderServiceConstructor<
    TModels,
    TSchema
  >;
}
