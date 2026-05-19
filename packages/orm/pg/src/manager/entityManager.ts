import type { Pool, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { PgEntityManagerConfig, LoggerInterface, ConnectionStatus, TransactionOptions, QueryContext } from "../types";
import { ConnectionManager } from "../connection";
import { ModelRegistry, ModelRegistryError } from "../registry";
import { TransactionManager } from "../transaction";
import { PgRepository, createRepository } from "../repository";
import { TransactionalEntityManager } from "./transactionalEntityManager";
import { EntityManagerError, QueryExecutionError } from "./error";
import { DefaultLogger } from "./logger";

export class PgEntityManager<TModels extends Record<string, ModelDefinition> = Record<string, ModelDefinition>> {
  [key: string]: any;
  private connectionManager: ConnectionManager;
  private modelRegistry: ModelRegistry;
  private transactionManager: TransactionManager | null = null;
  private logger: LoggerInterface;
  private repositories = new Map<string, PgRepository<QueryResultRow>>();
  private isInitialized = false;
  private modelsConfig: TModels;

  constructor(config: PgEntityManagerConfig<TModels>) {
    this.logger = config.logger ?? new DefaultLogger();
    this.connectionManager = new ConnectionManager(config.connection, this.logger);
    this.modelRegistry = new ModelRegistry(this.logger);
    this.modelRegistry.registerMany(config.models);
    this.modelsConfig = config.models;
    for (const key of Object.keys(config.models)) {
      Object.defineProperty(this, key, { get: () => this.getRepository(key), enumerable: true, configurable: true });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const pool = await this.connectionManager.connect();
      this.transactionManager = new TransactionManager(pool, this.logger);
      this._initializeRepositories();
      this.isInitialized = true;
      this.logger.info("PgEntityManager initialized successfully");
    } catch (e: any) {
      throw new EntityManagerError(`Initialization failed: ${e.message}`, e);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      await this.connectionManager.disconnect();
      this.repositories.clear();
      this.transactionManager = null;
      this.isInitialized = false;
      this.logger.info("PgEntityManager shut down successfully");
    } catch (e: any) {
      throw new EntityManagerError(`Shutdown failed: ${e.message}`, e);
    }
  }

  async healthCheck(): Promise<ConnectionStatus> { return this.connectionManager.healthCheck(); }

  getRepository<T extends QueryResultRow = QueryResultRow>(modelName: string): PgRepository<T> {
    if (!this.isInitialized) throw new EntityManagerError("EntityManager not initialized. Call initialize() first.");
    const entry = this.modelRegistry.get(modelName);
    if (!entry) throw new ModelRegistryError(`Model "${modelName}" not registered`);
    const cached = this.repositories.get(modelName);
    if (cached) return cached as PgRepository<T>;
    const repo = createRepository<T>(entry.model, this.connectionManager, this.logger);
    this.repositories.set(modelName, repo);
    return repo;
  }

  async transaction<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, options?: TransactionOptions): Promise<R> {
    if (!this.transactionManager) throw new EntityManagerError("Transaction manager not initialized");
    return this.transactionManager.run(async (ctx) => {
      const txManager = new TransactionalEntityManager<TModels>(this.modelRegistry, ctx, this.logger, this.modelsConfig);
      return cb(txManager as any);
    }, options);
  }

  async raw<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[], _ctx?: QueryContext): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.connectionManager.getPool().query<T>(sql, params || []);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (e: any) {
      throw new QueryExecutionError(`Query failed: ${e.message}`, e);
    }
  }

  getPool(): Pool | null { return this.connectionManager.isInitialized() ? this.connectionManager.getPool() : null; }
  registerModel(name: string, model: ModelDefinition): void {
    this.modelRegistry.register(name, model);
    if (this.isInitialized) this.repositories.set(name, createRepository(model, this.connectionManager, this.logger));
  }
  getRegisteredModels(): string[] { return this.modelRegistry.getModelNames(); }
  isReady(): boolean { return this.isInitialized; }
  repo<T extends QueryResultRow = QueryResultRow>(name: string): PgRepository<T> { return this.getRepository<T>(name); }
  async tx<R>(cb: (tx: TransactionalEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }) => Promise<R>, opt?: TransactionOptions): Promise<R> { return this.transaction<R>(cb, opt); }
  async execute<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> { return this.raw<T>(sql, params); }
  async close(): Promise<void> { return this.shutdown(); }

  private _initializeRepositories(): void {
    for (const [name, entry] of this.modelRegistry.getAll()) {
      this.repositories.set(name, createRepository(entry.model, this.connectionManager, this.logger));
    }
  }

  static async create<TModels extends Record<string, ModelDefinition>>(config: PgEntityManagerConfig<TModels>): Promise<PgEntityManager<TModels> & { readonly [K in keyof TModels]: PgRepository<any> }> {
    const manager = new PgEntityManager<TModels>(config);
    await manager.initialize();
    return manager as any;
  }
}
