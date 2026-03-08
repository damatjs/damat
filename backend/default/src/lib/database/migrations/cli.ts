/**
 * Migration CLI Entry Point
 *
 * Uses modules from config and runs the migration CLI.
 */

import { runCli } from "@damatjs/utils/dal";
import { getOrmConfig, getDbModules } from "@damatjs/utils";
// import path from "node:path";
import { fileURLToPath } from "url";

// Import config to ensure it's loaded

const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const ormConfig = getOrmConfig();
if (!ormConfig) {
    throw new Error("ORM config not initialized. Ensure damat.config.ts is loaded.");
}

const activeModules = getDbModules().map((m) => m.name);

// TODO: Fix this the module directory is not setup right
runCli({
    ormConfig,
    modulesDir: "./src/modules",
    activeModules: [],
    // modules: [Use],
    command: "create"
});
