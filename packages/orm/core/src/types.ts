import type { ModelDefinition } from "@damatjs/orm-model";

export interface ModelRegistryEntry {
  model: ModelDefinition;
  tableName: string;
  schema: string | undefined;
  columns: string[];
}
