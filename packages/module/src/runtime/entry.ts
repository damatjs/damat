import { startModuleApp } from "./start";

/**
 * Entry point for `damat module dev` — generated dev-entry files call this.
 * Boots the module package in the current working directory and keeps
 * the server running.
 */
export async function runModuleEntry(): Promise<void> {
  try {
    await startModuleApp();
  } catch (e) {
    console.error("Failed to start module:", e);
    process.exit(1);
  }
}
