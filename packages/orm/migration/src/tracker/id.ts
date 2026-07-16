export function migrationId(module: string, name: string): string {
  return `${module.length}_${module}_${name}`;
}
