# MikroORM Service

This module provides a base service class for standard CRUD operations using MikroORM.

## File Structure

- `types.ts`: Contains types and interfaces for the base service (`BaseEntity`, `PaginatedResult`, `ListOptions`).
- `base.ts`: Contains the `BaseModuleService` abstract class with common CRUD operations.
- `index.ts`: The main entry point that exports the types and base class.

## Usage

Each module can extend `BaseModuleService` to inherit standard data management operations.

```typescript
import { EntityManager } from "@damatjs/deps/mikro-orm/core";
import { BaseModuleService } from "@damatjs/service/microOrmService";
import { UserEntity } from "./user.entity";

export class UserService extends BaseModuleService<UserEntity> {
  constructor(em: EntityManager) {
    super(em, UserEntity);
  }

  // You can add additional custom methods here
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ email });
  }
}
```

### Provided Methods

- `create(data)`: Create a new entity.
- `createMany(dataArray)`: Create multiple entities.
- `findById(id)`: Find an entity by its ID.
- `findByIdOrFail(id)`: Find an entity by its ID, throws an error if not found.
- `findOne(filters)`: Find one entity matching the given filters.
- `findAll(filters?, options?)`: Find all entities matching the filters.
- `list(options?)`: Find entities with pagination.
- `update(id, data)`: Update an entity by ID.
- `updateMany(filters, data)`: Update multiple entities matching the filters.
- `delete(id)`: Delete an entity by ID.
- `deleteMany(filters)`: Delete multiple entities matching the filters.
- `softDelete(id)`: Soft delete an entity (requires `deletedAt` field).
- `count(filters?)`: Count the number of entities matching the filters.
- `exists(filters)`: Check if any entity matches the filters.
- `getEntityManager()`: Get the underlying MikroORM `EntityManager`.
