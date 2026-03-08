/**
 * User Module
 *
 * Provides user authentication and identity management.
 * This module is self-contained and can be added/removed independently.
 *
 * The module manages its own:
 * - Configuration (validated from environment)
 * - Service (with typed config access)
 * - Models (User, Account, Session, Verification)
 * - Migrations
 */

import { defineModule } from "@damatjs/services";
import UserModuleService from "./service";
import credentials from "./config";

export const USER_MODULE = "user";

const definition = defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials,
});


export default definition;
