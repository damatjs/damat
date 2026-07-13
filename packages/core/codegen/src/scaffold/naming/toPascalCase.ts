/** snake_case / kebab-case / spaced → PascalCase (mirrors orm-codegen). */
export function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
