import type { InstallMode, InstallRecipe } from "../types/recipe";

export function selectInstallMode(
  requested: InstallMode | undefined,
  recipe: InstallRecipe,
  supported: readonly InstallMode[],
): InstallMode {
  const selected = requested ?? recipe.install?.default ?? "source";
  if (recipe.install && !recipe.install.modes.includes(selected)) {
    throw new Error(`install mode ${selected} is not declared by the recipe`);
  }
  if (!supported.includes(selected))
    throw new Error(
      `install mode ${selected} is not supported by this artifact`,
    );
  return selected;
}
