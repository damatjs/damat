import { AuthProviderService } from "@damatjs/provider-auth";
import { defineModule } from "@damatjs/services";

const Base = AuthProviderService({ models: {} });

class BackendAuthProvider extends Base {
  async authenticate(credentials: { bearerToken: string | null }) {
    return credentials.bearerToken === "backend-session"
      ? { id: "backend-user" }
      : null;
  }
  async getPrincipal(id: string) {
    return id === "backend-user" ? { id } : null;
  }
  async issueApiKey(input: { subjectId: string; label: string }) {
    return {
      id: "backend-key",
      subjectId: input.subjectId,
      label: input.label,
      prefix: "dm_backend_",
      scopes: [],
      secret: "backend-secret",
      createdAt: new Date(),
    };
  }
  async getApiKey() {
    return null;
  }
  async listApiKeys() {
    return [];
  }
  async verifyApiKey(credentials: { apiKey: string | null }) {
    return credentials.apiKey === "backend-secret"
      ? { id: "backend-user", keyId: "backend-key", scopes: [] }
      : null;
  }
  async revokeApiKey(): Promise<void> { }
}

export default defineModule("test-auth", {
  service: BackendAuthProvider,
  credentials: () => undefined,
});
