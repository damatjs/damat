export function buildOptionFlag(option: { name: string; alias?: string }): string {
  return option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
}
