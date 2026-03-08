import type { ChildLogger } from "@damatjs/utils";
import type {
  CompositeServiceConfig,
  HealthCheckResult,
  ServiceMetadata,
  OperationMetrics,
  SafeExecuteOptions,
  OperationDefinition,
  ExecuteAllResult,
} from "./types";
import { checkDependency } from "./health";
import { MetricsTracker } from "./metrics";

/**
 * Base class for services that don't directly access the database
 *
 * Use this for:
 * - Orchestration services that coordinate multiple other services
 * - Notification/webhook services
 * - Aggregation services that combine data from multiple sources
 * - Facade services that simplify complex subsystems
 *
 * @example
 * ```typescript
 * class NotificationService extends BaseCompositeService {
 *   constructor(
 *     private webhookService: WebhookService,
 *     private emailService: EmailService,
 *     logger: Logger,
 *   ) {
 *     super({ name: "NotificationService", logger });
 *   }
 *
 *   async notifyTeam(teamId: string, event: string, data: unknown) {
 *     await Promise.all([
 *       this.webhookService.trigger(teamId, event, data),
 *       this.emailService.sendTeamNotification(teamId, event, data),
 *     ]);
 *   }
 * }
 * ```
 */
export class BaseCompositeService {
  protected readonly serviceName: string;
  protected readonly log: ChildLogger;
  protected readonly metadata: ServiceMetadata;
  private readonly metrics: MetricsTracker;

  constructor(config: CompositeServiceConfig) {
    this.serviceName = config.name;
    this.metadata = {
      name: config.name,
      version: config.version,
      description: config.description,
    };
    this.log = config.logger.child({ service: this.serviceName });
    this.metrics = new MetricsTracker();
  }

  // =========================================================================
  // HEALTH CHECKS
  // =========================================================================

  /**
   * Perform a health check
   * Override in subclasses to add custom health checks
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: "healthy",
      message: `${this.serviceName} is operational`,
    };
  }

  /**
   * Check health of a dependency service
   */
  protected checkDependency(
    name: string,
    check: () => Promise<boolean>,
  ): Promise<HealthCheckResult> {
    return checkDependency(name, check);
  }

  // =========================================================================
  // OPERATION TRACKING
  // =========================================================================

  /**
   * Track an operation for metrics
   */
  protected trackOperation<T>(
    operationName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.metrics.track(operationName, fn);
  }

  /**
   * Get operation metrics
   */
  getMetrics(): OperationMetrics {
    return this.metrics.getMetrics();
  }

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  /**
   * Execute with error handling and logging
   */
  protected async safeExecute<T>(
    operationName: string,
    fn: () => Promise<T>,
    options: SafeExecuteOptions<T> = {},
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.log.error(
        `Operation failed: ${operationName}`,
        error instanceof Error ? error : new Error(String(error)),
      );

      if (options.fallback !== undefined) {
        return options.fallback;
      }

      if (options.rethrow !== false) {
        throw error;
      }

      return undefined;
    }
  }

  /**
   * Execute multiple operations in parallel, collecting results and errors
   */
  protected async executeAll<T>(
    operations: OperationDefinition<T>[],
  ): Promise<ExecuteAllResult<T>> {
    const settled = await Promise.allSettled(
      operations.map(async (op) => ({
        name: op.name,
        result: await op.fn(),
      })),
    );

    const results: ExecuteAllResult<T>["results"] = [];
    const errors: ExecuteAllResult<T>["errors"] = [];

    for (const [i, outcome] of settled.entries()) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        errors.push({
          name: operations[i] ? operations[i].name : "unknown",
          error:
            outcome.reason instanceof Error
              ? outcome.reason
              : new Error(String(outcome.reason)),
        });
      }
    }

    return { results, errors };
  }

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  /**
   * Initialize the service
   * Override in subclasses for custom initialization
   */
  async initialize(): Promise<void> {
    this.log.info("Service initialized");
  }

  /**
   * Shutdown the service
   * Override in subclasses for cleanup
   */
  async shutdown(): Promise<void> {
    this.log.info("Service shut down");
  }
}
