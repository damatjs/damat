export interface AuthCredentials {
  readonly headers: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly authorization: string | null;
  readonly bearerToken: string | null;
  readonly apiKey: string | null;
}

export interface AuthPrincipal {
  id: string;
  email?: string;
  orgId?: string;
  claims?: Readonly<Record<string, unknown>>;
}

export interface ApiKeyPrincipal extends AuthPrincipal {
  keyId: string;
  scopes: readonly string[];
}

export interface ApiKeyRecord {
  id: string;
  subjectId: string;
  label: string;
  prefix: string;
  scopes: readonly string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface IssueApiKeyInput {
  subjectId: string;
  label: string;
  scopes?: readonly string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ListApiKeysInput {
  subjectId: string;
  includeRevoked?: boolean;
}

export interface IssuedApiKey extends ApiKeyRecord {
  /** Returned once. Implementations must persist only a one-way digest. */
  secret: string;
}

export interface AuthProvider {
  readonly providerRole?: "auth";
  authenticate(credentials: AuthCredentials): Promise<AuthPrincipal | null>;
  getPrincipal(id: string): Promise<AuthPrincipal | null>;
  issueApiKey(input: IssueApiKeyInput): Promise<IssuedApiKey>;
  getApiKey(id: string): Promise<ApiKeyRecord | null>;
  listApiKeys(input: ListApiKeysInput): Promise<readonly ApiKeyRecord[]>;
  verifyApiKey(credentials: AuthCredentials): Promise<ApiKeyPrincipal | null>;
  revokeApiKey(id: string): Promise<void>;
  rotateApiKey?(id: string): Promise<IssuedApiKey>;
}
