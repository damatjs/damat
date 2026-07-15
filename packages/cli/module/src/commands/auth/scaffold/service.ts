export function serviceTemplate(): string {
  return `import { ModuleService } from "@damatjs/framework";
import {
  AuthUserModel,
  AuthSessionModel,
  AuthAccountModel,
  AuthVerificationModel,
} from "./models";

export const models = {
  user: AuthUserModel,
  session: AuthSessionModel,
  account: AuthAccountModel,
  verification: AuthVerificationModel,
};

// Better Auth reads/writes these tables through its own adapter; this service
// exists so the module boots, migrates, and type-generates like any other.
export class AuthStorageService extends ModuleService({ models }) {}
`;
}
