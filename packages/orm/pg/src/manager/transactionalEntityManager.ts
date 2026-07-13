import type { QueryResultRow } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";
import { ModelRegistry, ModelRegistryError } from "@damatjs/orm-core";
import { PgRepository, createRepository } from "../repository";

export class TransactionalEntityManager<
  TModels extends Record<string, ModelDefinition> = Record<
    string,
    ModelDefinition
  >,
> {
  [key: string]: any;
  private modelRegistry: ModelRegistry;
  private transactionContext: any;
  private logger: ILogger;
  private repositories: Map<string, PgRepository<QueryResultRow>> = new Map();

  constructor(
    modelRegistry: ModelRegistry,
    transactionContext: any,
    logger: ILogger,
    modelsConfig?: TModels,
  ) {
    this.modelRegistry = modelRegistry;
    this.transactionContext = transactionContext;
    this.logger = logger;

    // Accessors come from the registry when no explicit config is given —
    // the entity manager registers models there, not in a config object.
    const modelNames = modelsConfig
      ? Object.keys(modelsConfig)
      : modelRegistry.getModelNames();

    for (const key of modelNames) {
      Object.defineProperty(this, key, {
        get: () => this.getRepository(key),
        enumerable: true,
        configurable: true,
      });
    }
  }

  getRepository<T extends QueryResultRow = QueryResultRow>(
    modelName: string,
  ): PgRepository<T> {
    const entry =
      this.modelRegistry.get(modelName) ??
      this.modelRegistry.getByTableName(modelName);
    if (!entry)
      throw new ModelRegistryError(`Model "${modelName}" not registered`);
    const cached = this.repositories.get(modelName);
    if (cached) return cached as PgRepository<T>;
    const client = this.transactionContext.getClient();
    const repo = createRepository<T>(entry.model, client, this.logger, true);
    this.repositories.set(modelName, repo);
    return repo;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.transactionContext.query(sql, params);
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

  repo<T extends QueryResultRow = QueryResultRow>(
    name: string,
  ): PgRepository<T> {
    return this.getRepository<T>(name);
  }

  async execute<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    return this.query<T>(sql, params);
  }
}
