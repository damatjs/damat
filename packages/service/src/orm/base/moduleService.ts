import type { Pool } from "@damatjs/deps/pg";
import { z } from "@damatjs/deps/zod";
import type { ModelDefinition } from "@damatjs/orm-model";

class ModuleServiceBase {
  static sharedPool: Pool | null = null;

  static init(pool: Pool): void {
    this.sharedPool = pool;
  }
}

export function ModuleService<
  TModels extends Record<string, ModelDefinition>,
  TSchema extends z.ZodObject<z.ZodRawShape>
>(models: TModels, schema?: TSchema) {

  console.log("credentials", schema)
  return class extends ModuleServiceBase {
    _db: any = null;
    models: TModels = models;


    get db(): any {
      if (!this._db) {
        if (!ModuleServiceBase.sharedPool) {
          throw new Error("ModuleService not initialized. Call ModuleService.init(pool) first.");
        }
        const { PgEntityManager } = require("@damatjs/orm-pg");
        this._db = new PgEntityManager({ pool: ModuleServiceBase.sharedPool, models: this.models });
      }
      return this._db;
    }

    constructor() {
      super();
      for (const key of Object.keys(models)) {
        Object.defineProperty(this, key, {
          get: () => this.db[key],
          enumerable: true,
          configurable: true,
        });
      }
    }
  };
}

export { ModuleServiceBase };
