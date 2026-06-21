
export function entryTemplate(name: string, serviceClass: string): string {
  return `import { defineModule } from "@damatjs/services";
import { ${serviceClass}, models } from "./service";
import credentials from "./config";

export const MODULE_ID = "${name}";

export { ${serviceClass}, models };

// The \`ModuleRegistry\` augmentation that makes \`getModule("${name}")\` resolve
// to \`${serviceClass}\` is generated into \`./types/registry.ts\` by codegen.

export default defineModule(MODULE_ID, {
  service: ${serviceClass},
  credentials: credentials.load,
});
`;
}