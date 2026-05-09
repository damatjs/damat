/**
 * Damatjs API - Main Entry Point
 */

import appConfig from "../damat.config";
import { waitForInit } from "@damatjs/utils";
import { bootstrap, startServer } from "@/server/bootstrap";
import { registerShutdownHandlers } from "@/server/shutdown";

async function main() {
  await waitForInit(appConfig);
  registerShutdownHandlers();

  const { app } = await bootstrap();
  startServer(app);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
