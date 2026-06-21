export function toCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function toPascal(name: string): string {
  const camel = toCamel(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
