/**
 * DAL Module - Connection Management
 *
 * Functions for managing database connections with singleton pattern.
 */

export { wrapOrmConnection } from "./wrapOrmConnection";
export {
  createConnection,
  createConnectionFromOptions,
} from "./createConnection";
export { initConnection, initConnectionFromOptions } from "./initConnection";
export { getConnection, getOrm, getEm } from "./getConnection";
export { closeConnection } from "./closeConnection";
export { isConnectionHealthy } from "./isConnectionHealthy";
