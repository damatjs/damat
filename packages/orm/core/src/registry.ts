import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { ModelRegistryEntry } from "./types";

export class ModelRegistry {
  private models: Map<string, ModelRegistryEntry> = new Map();
  private tableNameIndex: Map<string, string> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register(name: string, model: ModelDefinition): void {
    const tableName = model._tableName;
    const schema = model._schemaName;
    const columns = this._extractColumns(model);

    const entry: ModelRegistryEntry = {
      model,
      tableName,
      schema,
      columns,
    };

    this.models.set(name, entry);
    this.tableNameIndex.set(tableName, name);

    this.logger.debug(`Registered model: ${name} -> ${tableName}`, {
      columns: columns.length,
      schema: schema || "public",
    });
  }

  registerMany(models: Record<string, ModelDefinition>): void {
    for (const [name, model] of Object.entries(models)) {
      this.register(name, model);
    }
  }

  get(name: string): ModelRegistryEntry | undefined {
    return this.models.get(name);
  }

  getByTableName(tableName: string): ModelRegistryEntry | undefined {
    const name = this.tableNameIndex.get(tableName);
    if (!name) return undefined;
    return this.models.get(name);
  }

  getColumns(name: string): string[] {
    const entry = this.get(name);
    return entry?.columns || [];
  }

  getAll(): Map<string, ModelRegistryEntry> {
    return this.models;
  }

  has(name: string): boolean {
    return this.models.has(name);
  }

  getTableNames(): string[] {
    return Array.from(this.tableNameIndex.keys());
  }

  getModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  resolveRelation(
    modelName: string,
    propertyName: string
  ): ModelRegistryEntry | undefined {
    const entry = this.get(modelName);
    if (!entry) return undefined;

    const schema = entry.model.toTableSchema();
    const relation = schema.relations?.find(r => propertyName in r);
    
    if (!relation) return undefined;
    return this.getByTableName(relation.to);
  }

  private _extractColumns(model: ModelDefinition): string[] {
    const schema = model.toTableSchema();
    return schema.columns.map(c => c.name);
  }
}

export class ModelRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelRegistryError";
  }
}
