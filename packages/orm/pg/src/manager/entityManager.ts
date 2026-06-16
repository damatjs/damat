import type { Pool, QueryResultRow } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";
import { ModelRegistry, ModelRegistryError } from "@damatjs/orm-core";
import type { PgEntityManagerConfig } from "../types";
import { TransactionManager } from "../transaction";
import { PgRepository, createRepository } from "../repository";
import { TransactionalEntityManager } from "./transactionalEntityManager";
import { QueryExecutionError } from "./error";
import { Logger } from "@damatjs/logger";

export class PgEntityManager<TModels extends Record<string, ModelDefinition> = Record<string, ModelDefinition>> {
  private pool: Pool;
  private modelRegistry: ModelRegistry;
  private transactionManager: TransactionManager;
  private logger: ILogger;
  private repositories = new Map<string, PgRepository<QueryResultRow>>();

  constructor(config: PgEntityManagerConfig<TModels>) {
    this.pool = config.pool;
    this.logger = config.logger ?? new Logger({ prefix: "ORM", timestamp: true });
    this.modelRegistry = new ModelRegistry(this.logger);
    this.transactionManager = new TransactionManager(this.pool, this.logger);
    if (config.models) {
      for (const [name, model] of Object.entries(config.models)) {
        this.registerModel(name, model);
      }
    }
    this._initializeRepositories();
  }

  /**
   * Expose `manager.<name>` as a lazy repository accessor, mirroring the
   * `tx.<name>` accessors on the transactional manager. Never shadows a real
   * method/field (e.g. a model named "transaction" or "pool" keeps the
   * method; use getRepository(name) for it instead).
   */
  private _defineModelAccessor(name: string): void {
    if (name in this) return;
    Object.defineProperty(this, name, {
      get: () => this.getRepository(name),
      enumerable: true,
      configurable: true,
    });
  }

  getRepository<T extends QueryResultRow = QueryResultRow>(modelName: string): PgRepository<T> {
    const entry = this.modelRegistry.get(modelName);
    if (!entry) throw new ModelRegistryError(`Model "${modelName}" not registered`);
    const cached = this.repositories.get(modelName);
    if (cached) return cached as PgRepository<T>;
    const repo = createRepository<T>(entry.model, this.pool, this.logger);
    this.repositories.set(modelName, repo);
    return repo;
  }

  async transaction<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, options?: import("@damatjs/orm-type").TransactionOptions): Promise<R> {
    return this.transactionManager.run(async (ctx) => {
      // Model accessors are derived from the registry — there is no
      // per-instance models config on the entity manager.
      const txManager = new TransactionalEntityManager<TModels>(this.modelRegistry, ctx, this.logger);
      return cb(txManager as any);
    }, options);
  }

  async raw<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[], _ctx?: import("@damatjs/orm-model").QueryContext): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.pool.query<T>(sql, params || []);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (e: any) {
      throw new QueryExecutionError(`Query failed: ${e.message}`, e);
    }
  }

  getPool(): Pool { return this.pool; }
  getModelRegistry(): ModelRegistry { return this.modelRegistry; }

  registerModel(name: string, model: ModelDefinition): void {
    this.modelRegistry.register(name, model);
    this.repositories.set(name, createRepository(model, this.pool, this.logger));
    this._defineModelAccessor(name);
  }

  getRegisteredModels(): string[] { return this.modelRegistry.getModelNames(); }
  repo<T extends QueryResultRow = QueryResultRow>(name: string): PgRepository<T> { return this.getRepository<T>(name); }

  async tx<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, opt?: import("@damatjs/orm-type").TransactionOptions): Promise<R> {
    return this.transaction<R>(cb, opt);
  }

  async execute<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
    return this.raw<T>(sql, params);
  }

  private _initializeRepositories(): void {
    for (const [name, entry] of this.modelRegistry.getAll()) {
      this.repositories.set(name, createRepository(entry.model, this.pool, this.logger));
    }
  }
}
