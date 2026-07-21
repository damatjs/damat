import type { SubscriptionProvider } from "./types";

declare module "@damatjs/provider" {
  interface ProviderRegistry {
    subscription: SubscriptionProvider;
  }
}

export {};
