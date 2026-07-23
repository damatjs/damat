import { createServer } from "node:net";

export async function assertPortAvailable(
  port: number,
  host = "127.0.0.1",
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, host, () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}
