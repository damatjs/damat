import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import type { DatabaseConnection } from "../types";

/**
 * Create a DatabaseConnection wrapper from MikroORM instance.
 */
export function wrapOrmConnection(orm: MikroORM): DatabaseConnection {
  return {
    orm,
    em: orm.em,
    close: async () => {
      await orm.close();
    },
    isConnected: async () => {
      try {
        await orm.em.getConnection().execute("SELECT 1");
        return true;
      } catch {
        return false;
      }
    },
    fork: () => orm.em.fork(),
  };
}
