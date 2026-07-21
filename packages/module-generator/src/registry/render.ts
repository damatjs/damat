/**
 * The generated `types/registry.ts` content: the `ModuleRegistry` augmentation
 * that makes `getModule("<id>")` resolve to the typed service — no `as any`.
 *
 * `serviceImport` is the specifier registry.ts uses to import the service class.
 * It defaults to the relative `../service`; alias-mode callers pass
 * `@<id>/service` so the import survives the standalone→installed relocation.
 */
export function registryAugmentation(
  moduleId: string,
  serviceClass: string,
  serviceImport: string = "../service",
): string {
  return (
    "// This file is auto-generated. Do not edit it manually.\n" +
    "// Re-generate by running: bun run codegen\n\n" +
    `import type { ${serviceClass} } from "${serviceImport}";\n\n` +
    `declare module "@damatjs/services" {\n` +
    `  interface ModuleRegistry {\n` +
    `    "${moduleId}": ${serviceClass};\n` +
    `  }\n}\n`
  );
}

export function registryModuleAugmentation(
  moduleId: string,
  moduleName: string,
  moduleImport: string,
): string {
  return (
    "// This file is auto-generated. Do not edit it manually.\n" +
    "// Re-generate by running: bun run codegen\n\n" +
    `type ${moduleName} = typeof import("${moduleImport}").default;\n\n` +
    `declare module "@damatjs/services" {\n` +
    `  interface ModuleRegistry {\n` +
    `    "${moduleId}": ${moduleName}["service"];\n` +
    `  }\n}\n`
  );
}
