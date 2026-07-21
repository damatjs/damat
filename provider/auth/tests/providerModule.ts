import { z } from "@damatjs/deps/zod";
import { defineModule } from "@damatjs/services";
import {
  AuthProviderService,
  type ApiKeyRecord,
  type AuthCredentials,
  type AuthPrincipal,
  type IssueApiKeyInput,
  type IssuedApiKey,
  type ListApiKeysInput,
} from "../src";

const Base = AuthProviderService({
  models: {},
  credentialsSchema: z.object({ issuer: z.string().min(1) }),
});

export class FixtureAuthService extends Base {
  private readonly principals = new Map<string, AuthPrincipal>([
    ["user-1", { id: "user-1", email: "user@example.com" }],
  ]);
  private readonly keys = new Map<string, IssuedApiKey>();

  async authenticate(input: AuthCredentials): Promise<AuthPrincipal | null> {
    return input.bearerToken === "valid-session"
      ? this.principals.get("user-1")!
      : null;
  }

  async getPrincipal(id: string): Promise<AuthPrincipal | null> {
    return this.principals.get(id) ?? null;
  }

  async issueApiKey(input: IssueApiKeyInput): Promise<IssuedApiKey> {
    const id = `key-${this.keys.size + 1}`;
    const key = {
      ...input,
      id,
      scopes: input.scopes ?? [],
      prefix: "dm_test_",
      secret: `${id}-secret`,
      createdAt: new Date(),
    };
    this.keys.set(id, { ...key });
    return key;
  }

  async getApiKey(id: string): Promise<ApiKeyRecord | null> {
    return safeKey(this.keys.get(id));
  }

  async listApiKeys(input: ListApiKeysInput): Promise<readonly ApiKeyRecord[]> {
    return [...this.keys.values()]
      .filter((key) => key.subjectId === input.subjectId)
      .filter((key) => input.includeRevoked || !key.revokedAt)
      .map((key) => safeKey(key)!);
  }

  async verifyApiKey(input: AuthCredentials) {
    const key = [...this.keys.values()].find(
      (candidate) => candidate.secret === input.apiKey && !candidate.revokedAt,
    );
    return key
      ? { id: key.subjectId, keyId: key.id, scopes: key.scopes }
      : null;
  }

  async revokeApiKey(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) key.revokedAt = new Date();
  }

  async rotateApiKey(id: string): Promise<IssuedApiKey> {
    const key = this.keys.get(id);
    if (!key) throw new Error("Unknown API key");
    key.secret = `${id}-rotated`;
    return { ...key };
  }
}

function safeKey(key: IssuedApiKey | undefined): ApiKeyRecord | null {
  if (!key) return null;
  const { secret: _secret, ...record } = key;
  return record;
}

export default defineModule("fixture-auth", {
  service: FixtureAuthService,
  credentials: () => ({ issuer: "fixture" }),
});
