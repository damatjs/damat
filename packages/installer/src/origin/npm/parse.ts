import type { OriginRequest } from "../../types/origin";

export type NpmRequest = Extract<OriginRequest, { type: "npm" }>;

export function npmMetadataUrl(request: NpmRequest): string {
  const registry = (
    request.registryUrl ?? "https://registry.npmjs.org"
  ).replace(/\/+$/, "");
  return `${registry}/${encodeURIComponent(request.name)}`;
}
