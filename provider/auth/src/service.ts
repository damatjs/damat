import type { z } from "@damatjs/deps/zod";
import {
  ProviderService,
  type ProviderServiceInstance,
  type ServiceCredentials,
} from "@damatjs/provider";
import type { ModelsMap, ModuleServiceConfig } from "@damatjs/services";
import type {
  ApiKeyRecord,
  ApiKeyPrincipal,
  AuthCredentials,
  AuthPrincipal,
  AuthProvider,
  IssueApiKeyInput,
  IssuedApiKey,
  ListApiKeysInput,
} from "./types";

type AuthServiceInstance<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = ProviderServiceInstance<TModels, TSchema, "auth"> & AuthProvider;

export type AuthProviderServiceConstructor<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = (abstract new (
  credentials?: ServiceCredentials<TSchema>,
) => AuthServiceInstance<TModels, TSchema>) & {
  readonly providerRole: "auth";
};

export function AuthProviderService<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  config: ModuleServiceConfig<TModels, TSchema>,
): AuthProviderServiceConstructor<TModels, TSchema> {
  const Base = ProviderService({
    ...config,
    role: "auth" as const,
  }) as unknown as abstract new (credentials?: unknown) => object;
  abstract class GeneratedAuthProviderService extends Base {
    abstract authenticate(
      credentials: AuthCredentials,
    ): Promise<AuthPrincipal | null>;
    abstract getPrincipal(id: string): Promise<AuthPrincipal | null>;
    abstract issueApiKey(input: IssueApiKeyInput): Promise<IssuedApiKey>;
    abstract getApiKey(id: string): Promise<ApiKeyRecord | null>;
    abstract listApiKeys(
      input: ListApiKeysInput,
    ): Promise<readonly ApiKeyRecord[]>;
    abstract verifyApiKey(
      credentials: AuthCredentials,
    ): Promise<ApiKeyPrincipal | null>;
    abstract revokeApiKey(id: string): Promise<void>;
    rotateApiKey?(id: string): Promise<IssuedApiKey>;
  }
  return GeneratedAuthProviderService as unknown as AuthProviderServiceConstructor<
    TModels,
    TSchema
  >;
}
