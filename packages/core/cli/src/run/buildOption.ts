/**
 * Build the cac flag string for a command option. Non-boolean options MUST
 * declare a `<value>` placeholder — without it cac registers a bare boolean
 * flag, `--name my-app` parses as `name: true` with "my-app" demoted to a
 * positional, and coercion then stringifies it to "true".
 */
export function buildOptionFlag(option: {
  name: string;
  alias?: string;
  type?: "string" | "boolean" | "number";
}): string {
  const flag = option.alias
    ? `-${option.alias}, --${option.name}`
    : `--${option.name}`;
  return option.type && option.type !== "boolean" ? `${flag} <value>` : flag;
}
