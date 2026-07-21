import type { NpmRequest } from "./parse";

interface SelectedPackage {
  version: string;
  tarball: string;
  integrity?: string;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`invalid npm ${name}`);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`invalid npm ${name}`);
  return value;
}

export function selectPackageMetadata(
  request: NpmRequest,
  input: unknown,
): SelectedPackage {
  const metadata = record(input, "metadata");
  const versions = record(metadata.versions, "metadata versions");
  const tags = record(metadata["dist-tags"], "metadata dist-tags");
  const selector = request.version ?? "latest";
  const version =
    typeof tags[selector] === "string" ? String(tags[selector]) : selector;
  if (!(version in versions))
    throw new Error("npm version must be an exact version or dist-tag");
  const selected = record(versions[version], `version ${version}`);
  const dist = record(selected.dist, `version ${version} dist`);
  const integrity =
    dist.integrity === undefined
      ? undefined
      : text(dist.integrity, "integrity");
  return {
    version,
    tarball: text(dist.tarball, "tarball"),
    ...(integrity && { integrity }),
  };
}
