import { ModelDefinition } from "@damatjs/orm-model";
import {
  TransactionalEntityManager,
  PgRepository,
  PgEntityManager,
} from "@damatjs/orm-pg";
import { QueryResultRow, RelationSchema } from "@damatjs/orm-type";
import {
  CountOptions,
  CreateManyOptions,
  CreateOptions,
  DeleteOptions,
  ExistsOptions,
  FindOptions,
  SoftDeleteOptions,
  UpdateOptions,
} from "./type";

export class ModelMethods<T extends QueryResultRow = QueryResultRow> {
  private model: ModelDefinition;
  private modelName: string;
  private transactionalEm: TransactionalEntityManager | null = null;
  private entityManager?: PgEntityManager<Record<string, ModelDefinition>>;
  private _relations: RelationSchema[] | null = null;

  constructor(
    model: ModelDefinition,
    modelName: string,
    em: PgEntityManager<Record<string, ModelDefinition>>,
  ) {
    this.model = model;
    this.modelName = modelName;
    this.entityManager = em;
  }

  private getRepository(): PgRepository<T> {
    if (!this.entityManager) throw new Error("EntityManager not initialized");

    if (this.transactionalEm) {
      return this.transactionalEm.getRepository<T>(this.modelName);
    }

    return this.entityManager.getRepository<T>(this.modelName);
  }

  /**
   * Get the repository for a related model by name.
   * Used internally for loading relations.
   */
  private getRelatedRepository<R extends QueryResultRow = QueryResultRow>(
    relatedModelName: string,
  ): PgRepository<R> {
    if (!this.entityManager) throw new Error("EntityManager not initialized");

    if (this.transactionalEm) {
      return this.transactionalEm.getRepository<R>(relatedModelName);
    }

    return this.entityManager.getRepository<R>(relatedModelName);
  }

  setTransactionalEm(txEm: TransactionalEntityManager | null): void {
    this.transactionalEm = txEm;
  }

  /** Get the underlying ModelDefinition for introspection */
  getModelDefinition(): ModelDefinition {
    return this.model;
  }

  /** Get cached relation metadata for this model */
  private getRelations(): RelationSchema[] {
    if (!this._relations) {
      const schema = this.model.toTableSchema();
      this._relations = schema.relations ?? [];
    }
    return this._relations;
  }

  async create(options: CreateOptions): Promise<T> {
    this._validateData(options.data);
    const repo = this.getRepository();
    return repo.create(options as any);
  }

  async createMany(options: CreateManyOptions): Promise<T[]> {
    for (const item of options.data) {
      this._validateData(item);
    }
    const repo = this.getRepository();
    return repo.createMany(options as any);
  }

  async find(
    options: FindOptions = {},
  ): Promise<(T & Record<string, any>) | null> {
    const { include, ...findOpts } = options;
    const repo = this.getRepository();
    const result = await repo.findOne(findOpts as any);

    if (!result) return null;

    // If no relations to load, return as-is
    if (!include || include.length === 0) {
      return result as T & Record<string, any>;
    }

    // Load requested relations
    return this.loadRelations(result, include);
  }

  async findMany(
    options: FindOptions = {},
  ): Promise<(T & Record<string, any>)[]> {
    const { include, ...findOpts } = options;
    const repo = this.getRepository();
    const records = await repo.findMany(findOpts as any);

    // If no relations to load, return as-is
    if (!include || include.length === 0 || records.length === 0) {
      return records as (T & Record<string, any>)[];
    }

    // Load relations for each record
    const results: (T & Record<string, any>)[] = [];
    for (const record of records) {
      const loaded = await this.loadRelations(record, include);
      results.push(loaded);
    }
    return results;
  }

  /**
   * Load relations for a single record.
   */
  private async loadRelations(
    record: T,
    include: string[],
  ): Promise<T & Record<string, any>> {
    const relations = this.getRelations();
    const loaded: Record<string, any> = { ...record };

    for (const relationName of include) {
      const relation = relations.find((r) => r.from === relationName);
      if (!relation) continue;

      const loadedData = await this.loadRelation(record, relation);
      loaded[relationName] = loadedData;
    }

    return loaded as T & Record<string, any>;
  }

  /**
   * Load a single relation for a record.
   * Handles belongsTo, hasMany, and hasOne relation types.
   */
  private async loadRelation(
    record: T,
    relation: RelationSchema,
  ): Promise<any> {
    const relatedRepo = this.getRelatedRepository(relation.to);
    const pkValue = (record as any).id;

    if (relation.type === "belongsTo") {
      // For belongsTo, the FK is on this table
      const fkColumn = relation.linkedBy?.[0];
      if (!fkColumn) return null;
      const fkValue = (record as any)[fkColumn];
      if (!fkValue) return null;

      return relatedRepo.findOne({ where: { id: fkValue } as any });
    } else if (relation.type === "hasMany") {
      // For hasMany, the FK is on the related table pointing back to this one
      const fkColumn = relation.mappedBy?.[0]
        ? `${relation.mappedBy[0]}_id`
        : `${this.model._name}_id`;
      return relatedRepo.findMany({ where: { [fkColumn]: pkValue } as any });
    } else if (relation.type === "hasOne") {
      // For hasOne, similar to hasMany but returns single record
      const fkColumn = relation.mappedBy?.[0]
        ? `${relation.mappedBy[0]}_id`
        : `${this.model._name}_id`;
      return relatedRepo.findOne({ where: { [fkColumn]: pkValue } as any });
    }

    return null;
  }

  async update(options: UpdateOptions): Promise<T[]> {
    this._validateData(options.data, true);
    const repo = this.getRepository();
    // The repository's update contract is { set, where, returning }
    return repo.update({
      set: options.data,
      where: options.where,
      returning: options.returning,
    } as any);
  }

  async delete(options: DeleteOptions): Promise<number> {
    const repo = this.getRepository();
    return repo.delete(options as any);
  }

  async softDelete(options: SoftDeleteOptions): Promise<T[]> {
    const deletedAtField = this.model._deletedAtField ?? "deleted_at";
    const repo = this.getRepository();
    return repo.update({
      set: { [deletedAtField]: new Date() },
      where: options.where,
      returning: options.returning,
    } as any);
  }

  async restore(options: {
    where: Record<string, unknown>;
    returning?: string[];
  }): Promise<T[]> {
    const deletedAtField = this.model._deletedAtField ?? "deleted_at";
    const repo = this.getRepository();
    return repo.update({
      set: { [deletedAtField]: null },
      where: options.where,
      returning: options.returning,
    } as any);
  }

  async count(options: CountOptions = {}): Promise<number> {
    const repo = this.getRepository();
    return repo.count(options.where);
  }

  async exists(options: ExistsOptions): Promise<boolean> {
    const repo = this.getRepository();
    return repo.exists(options.where);
  }

  private _validateData(
    _data: Record<string, unknown>,
    _partial: boolean = false,
  ): void {}
}
