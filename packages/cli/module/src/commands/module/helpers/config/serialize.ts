import type { ModuleSource } from "@damatjs/framework";

export const toCamel = (name: string) =>
  name.replace(/-([a-z0-9])/g, (_, character: string) =>
    character.toUpperCase(),
  );

export function serializeSource(source: ModuleSource, indent: string): string {
  const order: (keyof ModuleSource)[] = [
    "type",
    "ref",
    "url",
    "version",
    "owner",
    "verification",
    "integrity",
    "installedAt",
  ];
  const lines = order
    .filter((field) => source[field] !== undefined)
    .map((field) => `${indent}  ${field}: ${JSON.stringify(source[field])},`);
  return `${indent}source: {\n${lines.join("\n")}\n${indent}},`;
}
