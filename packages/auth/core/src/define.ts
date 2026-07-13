import type { AuthAdapterFactory, AuthProvider } from "./types";

/**
 * Identity helper for authoring your OWN auth provider. Wrap a provider object
 * so TypeScript checks it against the {@link AuthProvider} contract as you
 * write it:
 *
 * ```ts
 * import { defineAuthProvider } from "@damatjs/auth";
 *
 * export const myProvider = defineAuthProvider({
 *   name: "my-idp",
 *   async authenticate(c) {
 *     const token = c.req.header("authorization");
 *     const user = await verifyWithMyIdp(token);
 *     return user ? { id: user.sub, email: user.email } : null;
 *   },
 * });
 * ```
 */
export function defineAuthProvider(provider: AuthProvider): AuthProvider {
  return provider;
}

/**
 * Identity helper for a custom adapter's **default export** — the factory the
 * framework calls with `services.auth.options`. Publish it under any package
 * name and point `services.auth.provider` at that name:
 *
 * ```ts
 * // @my-org/auth-my-idp  —  src/index.ts
 * import { defineAuthAdapter } from "@damatjs/auth";
 *
 * export default defineAuthAdapter((options) =>
 *   defineAuthProvider({ name: "my-idp", authenticate: async (c) => ... }),
 * );
 *
 * // damat.config.ts
 * services: { auth: { provider: "@my-org/auth-my-idp", options: { ... } } }
 * ```
 */
export function defineAuthAdapter(factory: AuthAdapterFactory): AuthAdapterFactory {
  return factory;
}
