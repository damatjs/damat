/**
 * User Module Service
 *
 * Handles CRUD operations and business logic for users and related entities.
 */

import { ModuleService } from "@damatjs/services";
import { User, Account, Session, Verification } from "./models";
import { schema } from "./config/schema";

class UserModuleService extends ModuleService({
  user: User,
  account: Account,
  session: Session,
  verification: Verification,
}, schema) {

}

export default UserModuleService;
