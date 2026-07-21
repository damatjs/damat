import type { ResolvedArtifact } from "../origin";
import type { InstallerOperation } from "../types/plan";
import type { InstallRecipe } from "../types/recipe";

function splitReference(value: string): { name: string; reference: string } {
  const separator = value.lastIndexOf("@");
  if (separator <= 0)
    throw new Error(`package reference must include a version: ${value}`);
  return {
    name: value.slice(0, separator),
    reference: value.slice(separator + 1),
  };
}

export function createPackageOperations(
  artifact: ResolvedArtifact,
  recipe: InstallRecipe,
): InstallerOperation[] {
  const primary = recipe.package
    ? {
        name: recipe.package.name,
        reference: recipe.package.ref ?? artifact.packageReference,
      }
    : artifact.packageReference
      ? splitReference(artifact.packageReference)
      : undefined;
  if (!primary?.reference)
    throw new Error("package mode requires an immutable package reference");
  const declared = Object.entries(recipe.packages ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return [
    { type: "add-package", name: primary.name, reference: primary.reference },
    ...declared.map(([name, reference]) => ({
      type: "add-package" as const,
      name,
      reference,
    })),
  ];
}
