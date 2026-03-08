import { EntityManager } from "@damatjs/deps/mikro-orm/core";
import { BaseEntity } from "../types";
import { BaseModuleService } from "./service";
import { EntityClass, EntityService } from "./types";

/**
 * Concrete implementation of BaseModuleService for factory usage
 */
class ModuleService<T extends BaseEntity> extends BaseModuleService<T> {
  constructor(em: EntityManager, entityClass: EntityClass<T>) {
    super(em, entityClass);
  }
}

/**
 * Creates a service instance for a single entity class
 */
export function createEntityService<T extends BaseEntity>(
  em: EntityManager,
  entityClass: EntityClass<T>,
): EntityService<T> {
  const service = new ModuleService(em, entityClass);

  return {
    create: service.create.bind(service),
    createMany: service.createMany.bind(service),
    findById: service.findById.bind(service),
    findByIdOrFail: service.findByIdOrFail.bind(service),
    findOne: service.findOne.bind(service),
    findAll: service.findAll.bind(service),
    list: service.list.bind(service),
    update: service.update.bind(service),
    updateMany: service.updateMany.bind(service),
    delete: service.delete.bind(service),
    deleteMany: service.deleteMany.bind(service),
    softDelete: service.softDelete.bind(service),
    count: service.count.bind(service),
    exists: service.exists.bind(service),
    getEntityManager: service.getEntityManager.bind(service),
  };
}
