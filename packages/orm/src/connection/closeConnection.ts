import { connectionInstance, setConnectionInstance } from "./singleton";

/**
 * Close the singleton database connection.
 */
export async function closeConnection(): Promise<void> {
  if (connectionInstance) {
    await connectionInstance.close();
    setConnectionInstance(null);
  }
}
