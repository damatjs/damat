export function gatewayBaseFromRegistryUrl(
  location: string | undefined,
): string | null {
  if (!location || !/^https?:\/\//.test(location)) return null;
  const url = new URL(location);
  let base = location
    .replace(/\/api\/damat\/modules\/?.*$/, "")
    .replace(/\/registry\.json\/?$/, "")
    .replace(/\/api\/registry\/modules\/?.*$/, "");
  if (base === location) base = `${url.protocol}//${url.host}`;
  return base.replace(/\/+$/, "");
}

interface PublishOptions {
  gatewayBase: string;
  name: string;
  version: string;
  tarballBytes: Uint8Array;
  token: string;
  manifest: Record<string, unknown>;
}

export async function publishToGateway(
  options: PublishOptions,
): Promise<{ success: boolean; package?: { name: string; version: string } }> {
  const { gatewayBase, name, version, tarballBytes, token, manifest } = options;
  const key = `${name}-${version}.tgz`;
  const body = {
    versions: { [version]: manifest },
    _attachments: {
      [key]: { data: Buffer.from(tarballBytes).toString("base64") },
    },
  };
  const response = await fetch(
    `${gatewayBase}/api/npm/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (response.status === 201)
    return (await response.json()) as {
      success: boolean;
      package?: { name: string; version: string };
    };
  const text = await response.text().catch(() => "(no body)");
  if (response.status === 401 || response.status === 403)
    throw new Error(
      `Publish rejected (${response.status}): invalid or expired publish token — check DAMAT_PUBLISH_TOKEN`,
    );
  if (response.status === 400)
    throw new Error(
      `Publish rejected (400): ${text} — check the module manifest and package.json`,
    );
  throw new Error(`Publish failed (${response.status}): ${text}`);
}
