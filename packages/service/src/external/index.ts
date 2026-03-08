/**
 * Base External API Service - External API Integration Template
 *
 * Provides a foundation for services that integrate with external APIs.
 * Includes retry logic, circuit breaker pattern, and error handling.
 *
 * @example
 * ```typescript
 * interface StripeClientConfig {
 *     apiKey: string;
 *     apiVersion: string;
 * }
 *
 * class StripeService extends BaseExternalApiService<Stripe, StripeClientConfig> {
 *     constructor(config: StripeClientConfig, logger: Logger) {
 *         super({
 *             serviceName: 'stripe',
 *             clientConfig: config,
 *             logger,
 *         });
 *     }
 *
 *     protected createClient(config: StripeClientConfig): Stripe {
 *         return new Stripe(config.apiKey, { apiVersion: config.apiVersion });
 *     }
 *
 *     async createCustomer(email: string) {
 *         return this.withRetry('createCustomer', () =>
 *             this.client.customers.create({ email })
 *         );
 *     }
 * }
 * ```
 */

// Types
export type * from "./types";

// Errors
export * from "./errors";

// Base classes
export * from "./base";
export * from "./http";
