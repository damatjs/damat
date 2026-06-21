/**
 * The generated `types/registry.ts` content: the `ModuleRegistry` augmentation
 * that makes `getModule("<id>")` resolve to the typed service — no `as any`.
 */
export function registryAugmentation(moduleId: string, serviceClass: string): string {
  return (
    "// This file is auto-generated. Do not edit it manually.\n" +
    "// Re-generate by running: bun run codegen\n\n" +
    `import type { ${serviceClass} } from "../service";\n\n` +
    `declare module "@damatjs/services" {\n` +
    `  interface ModuleRegistry {\n` +
    `    "${moduleId}": ${serviceClass};\n` +
    `  }\n}\n`
  );
}
