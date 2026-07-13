import type {
  PackageSummary,
  PackageInfo,
  VerdictPayload,
  PublishInput,
  PublishResult,
} from "./types.js";

export interface RegistryClientOptions {
  /** Base URL of the gateway, e.g. "http://localhost:7700/api" */
  baseUrl: string;
  /** Bearer token used for publish operations. */
  token?: string;
}

/** Typed HTTP client for the Damat registry gateway. */
export class RegistryClient {
  private readonly base: string;
  private readonly token: string | undefined;

  constructor(opts: RegistryClientOptions) {
    // Strip trailing slash for consistent path joining.
    this.base = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token;
  }

  /** GET /api/registry/packages(?q=&kind=) — list/search hosted packages. */
  async listPackages(opts?: { q?: string; kind?: "module" | "plain" }): Promise<PackageSummary[]> {
    const url = new URL(`${this.base}/registry/packages`);
    if (opts?.q) url.searchParams.set("q", opts.q);
    if (opts?.kind) url.searchParams.set("kind", opts.kind);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`listPackages: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { packages: PackageSummary[] };
    return json.packages;
  }

  /** GET /api/registry/packages/:name — kind + owner + verification + verdict. */
  async packageInfo(name: string): Promise<PackageInfo> {
    const url = `${this.base}/registry/packages/${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`packageInfo: ${res.status} ${await res.text()}`);
    return (await res.json()) as PackageInfo;
  }

  /** GET /api/registry/packages/:name/:version/source — raw tarball bytes. */
  async packageSource(name: string, version: string): Promise<Uint8Array> {
    const url = `${this.base}/registry/packages/${encodeURIComponent(name)}/${encodeURIComponent(version)}/source`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`packageSource: ${res.status} ${await res.text()}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  /** GET /api/registry/packages/:name/:version/verdict — security verdict for a package version.
   *  Returns { status: "unscanned" } when no verdict row exists (200). */
  async verdict(name: string, version: string): Promise<VerdictPayload> {
    const url = `${this.base}/registry/packages/${encodeURIComponent(name)}/${encodeURIComponent(version)}/verdict`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`verdict: ${res.status} ${await res.text()}`);
    return (await res.json()) as VerdictPayload;
  }

  /** PUT /api/npm/:name — npm-protocol publish.
   *  Sends the token as Authorization: Bearer <token>. */
  async publish(input: PublishInput): Promise<PublishResult> {
    const url = `${this.base}/npm/${encodeURIComponent(input.name)}`;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) headers["authorization"] = `Bearer ${this.token}`;
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(input.body),
    });
    if (!res.ok) throw new Error(`publish: ${res.status} ${await res.text()}`);
    return (await res.json()) as PublishResult;
  }
}
