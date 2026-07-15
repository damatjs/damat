import { hashBytes } from "../integrity";
import type { InstallRecipe } from "../types/recipe";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]),
  );
}

export function hashRecipe(recipe: InstallRecipe): string {
  return hashBytes(Buffer.from(JSON.stringify(canonical(recipe))));
}
