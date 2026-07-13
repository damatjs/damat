export * from "./manager";
export * from "./transaction";
export * from "./repository";
export * from "./executor";
export * from "./client";
export type * from "./types";

import { PgEntityManager } from "./manager";
export const EntityManager = PgEntityManager;
