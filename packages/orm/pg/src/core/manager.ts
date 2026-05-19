import type { Pool, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { 
  PgEntityManagerConfig, 
  LoggerInterface, 
  ConnectionStatus,
  TransactionOptions,
  QueryContext,
} from "./types";
import { ConnectionManager } from "./connection";
import { ModelRegistry, ModelRegistryError } from "./registry";
import { TransactionManager, TransactionContext } from "../transaction/manager";
import { PgRepository, createRepository } from "../repository/repository";

class DefaultLogger implements LoggerInterface {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, meta || "");
    }
  }
  
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, meta || "");
  }
  
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || "");
  }
  
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, meta || "");
  }
}

export class PgEntityManager {
  private connectionManager: ConnectionManager;
  private modelRegistry: ModelRegistry;
  private transactionManager: TransactionManager | null = null;
  private logger: LoggerInterface;
  private repositories: Map<string, PgRepository<QueryResultRow>> = new Map();
  private isInitialized: boolean = false;

  constructor(config: PgEntityManagerConfig) {
    this.logger = config.logger ?? new DefaultLogger();
    this.connectionManager = new ConnectionManager(config.connection, this.logger);
    this.modelRegistry = new ModelRegistry(this.logger);
    this.modelRegistry.registerMany(config.models);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const pool = await this.connectionManager.connect();
      this.transactionManager = new TransactionManager(pool, this.logger);
      this._initializeRepositories();
      this.isInitialized = true;
      this.logger.info("PgEntityManager initialized successfully");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to initialize PgEntityManager", { error: err.message });
      throw new EntityManagerError(`Initialization failed: ${err.message}`, err);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.connectionManager.disconnect();
      this.repositories.clear();
      this.transactionManager = null;
      this.isInitialized = false;
      this.logger.info("PgEntityManager shut down successfully");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to shut down PgEntityManager", { error: err.message });
      throw new EntityManagerError(`Shutdown failed: ${err.message}`, err);
    }
  }

  async healthCheck(): Promise<ConnectionStatus> {
    return this.connectionManager.healthCheck();
  }

  getRepository<T extends QueryResultRow = QueryResultRow>(
    modelName: string
  ): PgRepository<T> {
    if (!this.isInitialized) {
      throw new EntityManagerError("EntityManager not initialized. Call initialize() first.");
    }

    const entry = this.modelRegistry.get(modelName);
    if (!entry) {
      throw new ModelRegistryError(`Model "${modelName}" not registered`);
    }

    const cached = this.repositories.get(modelName);
    if (cached) {
      return cached as PgRepository<T>;
    }

    const repo = createRepository<T>(entry.model, this.connectionManager, this.logger);
    this.repositories.set(modelName, repo);
    return repo;
  }

  async transaction<R>(
    callback: (tx: TransactionalEntityManager) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R> {
    if (!this.transactionManager) {
      throw new EntityManagerError("Transaction manager not initialized");
    }

    return this.transactionManager.run(async (ctx) => {
      const txManager = new TransactionalEntityManager(
        this.modelRegistry,
        ctx,
        this.logger
      );
      return callback(txManager);
    }, options);
  }

  async raw<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
    _context?: QueryContext
  ): Promise<{ rows: T[]; rowCount: number }> {
    const pool = this.connectionManager.getPool();
    
    try {
      const result = await pool.query<T>(sql, params || []);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Raw query failed", { sql: sql.substring(0, 100), error: err.message });
      throw new QueryExecutionError(`Query failed: ${err.message}`, err);
    }
  }

  getPool(): Pool | null {
    return this.connectionManager.isInitialized() 
      ? this.connectionManager.getPool() 
      : null;
  }

  registerModel(name: string, model: ModelDefinition): void {
    this.modelRegistry.register(name, model);
    
    if (this.isInitialized) {
      const repo = createRepository(model, this.connectionManager, this.logger);
      this.repositories.set(name, repo);
    }
  }

  getRegisteredModels(): string[] {
    return this.modelRegistry.getModelNames();
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  private _initializeRepositories(): void {
    for (const [name, entry] of this.modelRegistry.getAll()) {
      const repo = createRepository(entry.model, this.connectionManager, this.logger);
      this.repositories.set(name, repo);
    }
  }

  static async create(config: PgEntityManagerConfig): Promise<PgEntityManager> {
    const manager = new PgEntityManager(config);
    await manager.initialize();
    return manager;
  }
}

export class TransactionalEntityManager {
  private modelRegistry: ModelRegistry;
  private transactionContext: TransactionContext;
  private logger: LoggerInterface;
  private repositories: Map<string, PgRepository<QueryResultRow>> = new Map();

  constructor(
    modelRegistry: ModelRegistry,
    transactionContext: TransactionContext,
    logger: LoggerInterface
  ) {
    this.modelRegistry = modelRegistry;
    this.transactionContext = transactionContext;
    this.logger = logger;
  }

  getRepository<T extends QueryResultRow = QueryResultRow>(
    modelName: string
  ): PgRepository<T> {
    const entry = this.modelRegistry.get(modelName);
    if (!entry) {
      throw new ModelRegistryError(`Model "${modelName}" not registered`);
    }

    const cached = this.repositories.get(modelName);
    if (cached) {
      return cached as PgRepository<T>;
    }

    const client = this.transactionContext.getClient();
    const repo = createRepository<T>(entry.model, client, this.logger, true);
    this.repositories.set(modelName, repo);
    return repo;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.transactionContext.query<T>(sql, params);
  }

  async createSavepoint(name: string): Promise<void> {
    await this.transactionContext.createSavepoint(name);
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    await this.transactionContext.rollbackToSavepoint(name);
  }

  async releaseSavepoint(name: string): Promise<void> {
    await this.transactionContext.releaseSavepoint(name);
  }
}

export class EntityManagerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "EntityManagerError";
  }
}

export class QueryExecutionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "QueryExecutionError";
  }
}
