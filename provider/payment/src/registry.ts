import type { PaymentProvider } from "./types";

declare module "@damatjs/provider" {
  interface ProviderRegistry {
    payment: PaymentProvider;
  }
}

export {};
