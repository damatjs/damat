import type { InstallRecipe } from "../types";
import { matchProfiles } from "./match";
import type { MatchProfilesInput } from "./types";

export function createProfileRecipe(input: MatchProfilesInput): InstallRecipe {
  const { provider } = input;
  const profile = provider.install;
  const mappings = matchProfiles(input)
    .map(({ from, to }) => ({ from, to }))
    .sort((left, right) => Number(left.from === "**") - Number(right.from === "**"));
  const install = profile?.modes
    ? { modes: profile.modes, ...(profile.default && { default: profile.default }) }
    : undefined;
  return {
    schemaVersion: 1,
    id: provider.name,
    kind: provider.kind,
    ...(provider.version && { version: provider.version }),
    ...(install && { install }),
    ...(mappings.length > 0 && { mappings }),
    ...(profile?.ignore && { ignore: profile.ignore }),
    ...(profile?.packages && { packages: profile.packages }),
    ...(profile?.usageHints && { usageHints: profile.usageHints }),
  };
}
