import type { AuthProvider } from "./types";

declare module "@damatjs/provider" {
  interface ProviderRegistry {
    auth: AuthProvider;
  }
}

export {};
