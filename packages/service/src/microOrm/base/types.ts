import {
  EntityManager,
  FilterQuery,
  FindOptions,
  RequiredEntityData,
} from "@damatjs/deps/mikro-orm/core";
import { BaseEntity, ListOptions, PaginatedResult } from "../types";

/**
 * Entity class constructor type
 */
export type EntityClass<T extends BaseEntity> = new () => T;

/**
 * Configuration for an entity in the services map
 */
export interface EntityConfig<T extends BaseEntity = BaseEntity> {
  entityClass: EntityClass<T>;
}

/**
 * Map of entity names to their configurations
 */
export type EntitiesConfig = Record<string, EntityConfig<any>>;

/**
 * Service instance type for an entity
 */
export type EntityService<T extends BaseEntity> = {
  create: (data: RequiredEntityData<T>) => Promise<T>;
  createMany: (dataArray: RequiredEntityData<T>[]) => Promise<T[]>;
  findById: (id: string) => Promise<T | null>;
  findByIdOrFail: (id: string) => Promise<T>;
  findOne: (filters: FilterQuery<T>) => Promise<T | null>;
  findAll: (filters?: FilterQuery<T>, options?: FindOptions<T>) => Promise<T[]>;
  list: (options?: ListOptions<T>) => Promise<PaginatedResult<T>>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  updateMany: (filters: FilterQuery<T>, data: Partial<T>) => Promise<number>;
  delete: (id: string) => Promise<void>;
  deleteMany: (filters: FilterQuery<T>) => Promise<number>;
  softDelete: (id: string) => Promise<T>;
  count: (filters?: FilterQuery<T>) => Promise<number>;
  exists: (filters: FilterQuery<T>) => Promise<boolean>;
  getEntityManager: () => EntityManager;
};

/**
 * Maps entity config to service types
 */
export type ServicesMap<T extends EntitiesConfig> = {
  [K in keyof T]: T[K] extends EntityConfig<infer E> ? EntityService<E> : never;
};

