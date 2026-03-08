import { BaseCompositeService } from "./base";

/**
 * Specialized composite service for data aggregation
 *
 * @example
 * ```typescript
 * interface DashboardSources {
 *   team: Team;
 *   usage: UsageStats;
 *   members: Member[];
 * }
 *
 * class DashboardService extends BaseAggregatorService<string, DashboardSources> {
 *   constructor(
 *     private teamService: TeamService,
 *     private usageService: UsageService,
 *     logger: Logger,
 *   ) {
 *     super({ name: "DashboardService", logger });
 *   }
 *
 *   protected fetchSources(teamId: string) {
 *     return {
 *       team: () => this.teamService.getTeam(teamId),
 *       usage: () => this.usageService.getTeamUsage(teamId),
 *       members: () => this.teamService.getMembers(teamId),
 *     };
 *   }
 *
 *   async getDashboard(teamId: string) {
 *     return this.aggregate(teamId);
 *   }
 * }
 * ```
 */
export abstract class BaseAggregatorService<
  TKey = string,
  TSources extends Record<string, unknown> = Record<string, unknown>,
> extends BaseCompositeService {
  /**
   * Define data sources to fetch
   * Override in subclasses
   */
  protected abstract fetchSources(
    key: TKey,
  ): Record<string, () => Promise<unknown>>;

  /**
   * Aggregate data from multiple sources
   */
  protected async aggregate(key: TKey): Promise<Partial<TSources>> {
    const sources = this.fetchSources(key);
    const results: Partial<TSources> = {};

    const { results: successResults, errors } = await this.executeAll(
      Object.entries(sources).map(([name, fn]) => ({
        name,
        fn: fn as () => Promise<unknown>,
      })),
    );

    // Collect successful results
    for (const { name, result } of successResults) {
      (results as Record<string, unknown>)[name] = result;
    }

    // Log errors but don't fail
    for (const { name, error } of errors) {
      this.log.warn(`Failed to fetch ${name}`, { error: error.message });
    }

    return results;
  }

  /**
   * Aggregate with required fields
   * Throws if any required source fails
   */
  protected async aggregateRequired<TRequired extends keyof TSources>(
    key: TKey,
    requiredFields: TRequired[],
  ): Promise<Pick<TSources, TRequired> & Partial<TSources>> {
    const result = await this.aggregate(key);

    for (const field of requiredFields) {
      if (result[field] === undefined) {
        throw new Error(`Required field '${String(field)}' failed to load`);
      }
    }

    return result as Pick<TSources, TRequired> & Partial<TSources>;
  }
}
