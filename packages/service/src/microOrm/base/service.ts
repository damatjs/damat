import {
  EntityManager,
  EntityRepository,
  FilterQuery,
  FindOptions,
  RequiredEntityData,
} from "@damatjs/deps/mikro-orm/core";
import { BaseEntity, ListOptions, PaginatedResult } from "../types";

/**
 * Base service class that provides standard CRUD operations
 */
export abstract class BaseModuleService<T extends BaseEntity> {
  protected readonly em: EntityManager;
  protected readonly repository: EntityRepository<T>;
  protected readonly entityName: string;

  constructor(
    em: EntityManager,
    private readonly entityClass: new () => T,
  ) {
    this.em = em;
    this.repository = em.getRepository(entityClass);
    this.entityName = entityClass.name;
  }

  /**
   * Create a new entity
   */
  async create(data: RequiredEntityData<T>): Promise<T> {
    const entity = this.em.create(this.entityClass, data);
    await this.em.persist(entity).flush();
    return entity;
  }

  /**
   * Create multiple entities
   */
  async createMany(dataArray: RequiredEntityData<T>[]): Promise<T[]> {
    const entities = dataArray.map((data) =>
      this.em.create(this.entityClass, data),
    );
    await this.em.persist(entities).flush();
    return entities;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ id } as FilterQuery<T>);
  }

  /**
   * Find entity by ID or throw error
   */
  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`${this.entityName} with id '${id}' not found`);
    }
    return entity;
  }

  /**
   * Find one entity by filters
   */
  async findOne(filters: FilterQuery<T>): Promise<T | null> {
    return this.repository.findOne(filters);
  }

  /**
   * Find all entities matching filters
   */
  async findAll(
    filters?: FilterQuery<T>,
    options?: FindOptions<T>,
  ): Promise<T[]> {
    return this.repository.find(filters || {}, options);
  }

  /**
   * Find entities with pagination
   */
  async list(options: ListOptions<T> = {}): Promise<PaginatedResult<T>> {
    const { page = 1, pageSize = 20, orderBy, filters = {} } = options;

    const offset = (page - 1) * pageSize;

    const [data, total] = await this.repository.findAndCount(filters, {
      limit: pageSize,
      offset,
      ...(orderBy ? { orderBy } : {}),
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const entity = await this.findByIdOrFail(id);
    this.em.assign(entity, data as any);
    await this.em.flush();
    return entity;
  }

  /**
   * Update multiple entities
   */
  async updateMany(filters: FilterQuery<T>, data: Partial<T>): Promise<number> {
    const entities = await this.findAll(filters);
    for (const entity of entities) {
      this.em.assign(entity, data as any);
    }
    await this.em.flush();
    return entities.length;
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<void> {
    const entity = await this.findByIdOrFail(id);
    await this.em.remove(entity).flush();
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(filters: FilterQuery<T>): Promise<number> {
    const entities = await this.findAll(filters);
    await this.em.remove(entities).flush();
    return entities.length;
  }

  /**
   * Soft delete entity by ID (if entity has deletedAt field)
   */
  async softDelete(id: string): Promise<T> {
    const entity = await this.findByIdOrFail(id);
    (entity as T & { deletedAt?: Date }).deletedAt = new Date();
    await this.em.flush();
    return entity;
  }

  /**
   * Count entities matching filters
   */
  async count(filters?: FilterQuery<T>): Promise<number> {
    return this.repository.count(filters || {});
  }

  /**
   * Check if entity exists
   */
  async exists(filters: FilterQuery<T>): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  /**
   * Get the entity manager (for advanced operations)
   */
  getEntityManager(): EntityManager {
    return this.em;
  }
}
