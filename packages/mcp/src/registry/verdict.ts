import { REGISTRY_FETCH_TIMEOUT_MS } from "./fetch";
import type { RegistryVerdict } from "./types";

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function gatewayBase(location: string): string | null {
  if (!isUrl(location)) return null;
  const parsed = new URL(location);
  let base = location
    .replace(/\/api\/damat\/modules\/?.*$/, "")
    .replace(/\/registry\.json\/?$/, "")
    .replace(/\/api\/registry\/modules\/?.*$/, "");
  if (base === location) base = `${parsed.protocol}//${parsed.host}`;
  return base.replace(/\/+$/, "");
}

export async function fetchVerdict(
  registryLocation: string,
  name: string,
  version: string,
): Promise<RegistryVerdict | null> {
  const base = gatewayBase(registryLocation);
  if (!base) return null;
  const encodedName = encodeURIComponent(name);
  const encodedVersion = encodeURIComponent(version);
  const url =
    `${base}/api/registry/packages/${encodedName}/${encodedVersion}/verdict`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REGISTRY_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as RegistryVerdict;
    if (!json || typeof json.status !== "string") return null;
    return json;
  } catch {
    return null;
  }
}
