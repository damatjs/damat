// ─── Helper ───────────────────────────────────────────────────────────────────

/** Convert snake_case / kebab-case / spaced table name to PascalCase */
export const toPascalCase = (str: string): string => {
  return str
    .split(/[_\-\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

/** snake_case → camelCase (simple single-pass) */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
};

/**
 * Convert an enum schema name to its generated TypeScript type alias name.
 * Applies PascalCase and appends the `Enum` suffix for clarity.
 *
 * `product_status` → `ProductStatusEnum`
 * `orders`         → `OrdersEnum`
 */
export const toEnumTypeName = (enumName: string): string => {
  return `${toPascalCase(enumName)}Enum`;
};
