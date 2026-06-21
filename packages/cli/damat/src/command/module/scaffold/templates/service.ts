export function serviceTemplate(serviceClass: string): string {
  return `import { ModuleService } from "@damatjs/services";
import { collectModels } from "@damatjs/orm-model";
import { schema } from "./config/schema";

// Pass models as an ARRAY — \`collectModels\` derives each accessor key from the
// model's table name (the source of truth), so you never hand-write a key.
// e.g. model("items") → service.items.
export const models = collectModels([
  // YourModel,
]);

export class ${serviceClass} extends ModuleService({
  models,
  credentialsSchema: schema,
}) {}
`;
}
