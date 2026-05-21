import type { Pool, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { PgEntityManagerConfig, LoggerInterface, TransactionOptions, QueryContext } from "../types";
import { ModelRegistry, ModelRegistryError } from "../registry";
import { TransactionManager } from "../transaction";
import { PgRepository, createRepository } from "../repository";
import { TransactionalEntityManager } from "./transactionalEntityManager";
import { QueryExecutionError } from "./error";
import { DefaultLogger } from "./logger";

export class PgEntityManager<TModels extends Record<string, ModelDefinition> = Record<string, ModelDefinition>> {
  [key: string]: any;
  private pool: Pool;
  private modelRegistry: ModelRegistry;
  private transactionManager: TransactionManager;
  private logger: LoggerInterface;
  private repositories = new Map<string, PgRepository<QueryResultRow>>();
  private modelsConfig: TModels;

  constructor(config: PgEntityManagerConfig<TModels>) {
    this.pool = config.pool;
    this.logger = config.logger ?? new DefaultLogger();
    this.modelRegistry = new ModelRegistry(this.logger);
    this.modelRegistry.registerMany(config.models);
    this.modelsConfig = config.models;
    this.transactionManager = new TransactionManager(this.pool, this.logger);
    this._initializeRepositories();

    for (const key of Object.keys(config.models)) {
      Object.defineProperty(this, key, { get: () => this.getRepository(key), enumerable: true, configurable: true });
    }
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

  async transaction<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, options?: TransactionOptions): Promise<R> {
    return this.transactionManager.run(async (ctx) => {
      const txManager = new TransactionalEntityManager<TModels>(this.modelRegistry, ctx, this.logger, this.modelsConfig);
      return cb(txManager as any);
    }, options);
  }

  async raw<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[], _ctx?: QueryContext): Promise<{ rows: T[]; rowCount: number }> {
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
  }

  getRegisteredModels(): string[] { return this.modelRegistry.getModelNames(); }
  repo<T extends QueryResultRow = QueryResultRow>(name: string): PgRepository<T> { return this.getRepository<T>(name); }
  
  async tx<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, opt?: TransactionOptions): Promise<R> { 
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
