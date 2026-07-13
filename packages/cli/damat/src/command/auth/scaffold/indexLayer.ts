
export function indexTemplate(): string {
  return `import { defineModule } from "@damatjs/framework";
import { AuthStorageService } from "./service";

export const AUTH_MODULE = "auth";

// Storage-only module for the Better Auth tables. No credentials of its own —
// the Better Auth adapter is configured in damat.config.ts (services.auth).
export default defineModule(AUTH_MODULE, {
  service: AuthStorageService,
  credentials: () => ({}),
});
`;
}
