import { expandDestination } from "./destination";
import type { CapabilityMatch, MatchProfilesInput } from "./types";

export function matchProfiles(input: MatchProfilesInput): CapabilityMatch[] {
  const provides = input.provider.install?.provides ?? {};
  const accepts = input.receiver?.install?.accepts ?? {};
  const overrides = input.overrides?.targets ?? {};
  const unknownOverride = Object.keys(overrides).find(
    (name) => !provides[name],
  );
  if (unknownOverride)
    throw new Error(
      `target override has no provided capability: ${unknownOverride}`,
    );
  return Object.keys(provides)
    .sort()
    .map((capability) => {
      const provided = provides[capability]!;
      const destination =
        overrides[capability] ?? accepts[capability]?.to ?? provided.fallbackTo;
      if (!destination)
        throw new Error(`no destination for capability: ${capability}`);
      const source = overrides[capability]
        ? "override"
        : accepts[capability]
          ? "receiver"
          : "fallback";
      return {
        capability,
        from: provided.from,
        to: expandDestination(destination, input.provider.name),
        source,
      };
    });
}
